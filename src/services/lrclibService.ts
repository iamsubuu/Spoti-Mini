import type { LrclibLookupRequest, LrclibLookupResult } from '../types/extension';
import type { LyricLine } from '../types/player';

const LRCLIB_BASE = 'https://lrclib.net/api';
const LYRICS_CACHE_KEY = 'spotifyMiniLyricsCache';
const MAX_CACHE_ENTRIES = 50;
const HIT_TTL_MS = 24 * 60 * 60 * 1000;
const MISS_TTL_MS = 10 * 60 * 1000;

interface LrclibRecord {
  id: number;
  trackName?: string;
  artistName?: string;
  albumName?: string;
  duration?: number;
  instrumental?: boolean;
  plainLyrics?: string | null;
  syncedLyrics?: string | null;
}

interface CachedLyricsEntry {
  result: LrclibLookupResult;
  cachedAt: number;
}

const memoryCache = new Map<string, CachedLyricsEntry>();
const inflightRequests = new Map<string, Promise<LrclibLookupResult>>();

/**
 * Parses LRC formatted synced lyrics into sorted LyricLine entries.
 * Supports `[mm:ss.xx]`, `[mm:ss.xxx]`, `[hh:mm:ss.xx]`, multiple timestamps per line,
 * and `[offset:ms]` tags.
 */
export function parseLrc(lrcText: string): LyricLine[] {
  if (!lrcText || !lrcText.trim()) return [];

  let offsetSec = 0;
  const lines: LyricLine[] = [];
  const rawLines = lrcText.split(/\r?\n/);

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // Metadata tag like [offset:+200] or [ti:Title]
    const offsetMatch = trimmed.match(/^\[offset:\s*([+-]?\d+)\s*\]$/i);
    if (offsetMatch) {
      offsetSec = Number(offsetMatch[1]) / 1000;
      continue;
    }

    const timestampRegex = /\[(?:(\d+):)?(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g;
    const timestamps: number[] = [];
    let match: RegExpExecArray | null;
    let lastIndex = 0;

    while ((match = timestampRegex.exec(trimmed)) !== null) {
      const hours = match[1] ? Number(match[1]) : 0;
      const mins = Number(match[2]);
      const secs = Number(match[3]);
      const fracRaw = match[4] ?? '0';
      const frac = Number(fracRaw) / Math.pow(10, fracRaw.length);
      timestamps.push(hours * 3600 + mins * 60 + secs + frac);
      lastIndex = timestampRegex.lastIndex;
    }

    if (timestamps.length === 0) continue;

    const text = trimmed.slice(lastIndex).trim();
    if (!text) continue;

    for (const ts of timestamps) {
      lines.push({
        timeSec: Math.max(0, Number((ts + offsetSec).toFixed(2))),
        text,
      });
    }
  }

  lines.sort((a, b) => a.timeSec - b.timeSec);
  return lines;
}

export function parsePlainLyrics(plainText: string): LyricLine[] {
  if (!plainText || !plainText.trim()) return [];
  return plainText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((text) => ({ timeSec: -1, text }));
}

export function cleanTrackTitle(title: string): string {
  return title
    .replace(
      /\s*-\s*(?:\d{4}\s+)?(Remastered|Remaster|Radio Edit|Single Version|Album Version|Live|Acoustic|Deluxe).*$/i,
      ''
    )
    .replace(
      /\s*\((?:\d{4}\s+)?(feat\.|ft\.|with|Remastered|Remaster|Radio Edit|Single Version|Deluxe|Explicit|Clean)[^)]*\)/gi,
      ''
    )
    .replace(/\s*\[[^\]]*\]/g, '')
    .trim();
}

export function primaryArtistName(artist: string): string {
  return artist.split(',')[0].trim();
}

function normalizeCacheKey(req: LrclibLookupRequest): string {
  return `${req.title.trim().toLowerCase()}::${req.artist.trim().toLowerCase()}::${Math.round(req.durationSec ?? 0)}`;
}

async function readStorageCache(): Promise<Record<string, CachedLyricsEntry>> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return {};
  try {
    const res = await chrome.storage.local.get(LYRICS_CACHE_KEY);
    return (res[LYRICS_CACHE_KEY] as Record<string, CachedLyricsEntry>) ?? {};
  } catch {
    return {};
  }
}

async function writeStorageCache(
  key: string,
  entry: CachedLyricsEntry
): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return;
  try {
    const existing = await readStorageCache();
    existing[key] = entry;
    const entries = Object.entries(existing);
    if (entries.length > MAX_CACHE_ENTRIES) {
      entries.sort((a, b) => b[1].cachedAt - a[1].cachedAt);
      const pruned = Object.fromEntries(entries.slice(0, MAX_CACHE_ENTRIES));
      await chrome.storage.local.set({ [LYRICS_CACHE_KEY]: pruned });
    } else {
      await chrome.storage.local.set({ [LYRICS_CACHE_KEY]: existing });
    }
  } catch {
    // Ignore storage cache write errors.
  }
}

function pickBestCandidate(
  records: LrclibRecord[],
  targetDurationSec?: number
): LrclibRecord | null {
  if (!Array.isArray(records) || records.length === 0) return null;

  const scored = records
    .filter((r) => Boolean(r.syncedLyrics || r.plainLyrics || r.instrumental))
    .map((r) => {
      let score = 0;
      if (r.syncedLyrics) score += 100;
      else if (r.plainLyrics) score += 40;
      else if (r.instrumental) score += 20;

      if (
        typeof targetDurationSec === 'number' &&
        targetDurationSec > 0 &&
        typeof r.duration === 'number' &&
        r.duration > 0
      ) {
        const diff = Math.abs(r.duration - targetDurationSec);
        if (diff <= 3) score += 50;
        else if (diff <= 10) score += 25;
        else if (diff <= 20) score += 5;
        else score -= Math.min(40, diff);
      }
      return { r, score };
    });

  if (scored.length === 0) return null;
  scored.sort((a, b) => b.score - a.score);
  return scored[0].r;
}

function recordToResult(
  trackKey: string,
  record: LrclibRecord | null
): LrclibLookupResult {
  if (!record) {
    return {
      trackKey,
      found: false,
      instrumental: false,
      synced: false,
      lines: [],
    };
  }

  if (record.instrumental) {
    return {
      trackKey,
      found: true,
      instrumental: true,
      synced: false,
      lines: [],
    };
  }

  if (record.syncedLyrics) {
    const parsed = parseLrc(record.syncedLyrics);
    if (parsed.length > 0) {
      return {
        trackKey,
        found: true,
        instrumental: false,
        synced: true,
        lines: parsed,
      };
    }
  }

  if (record.plainLyrics) {
    const plain = parsePlainLyrics(record.plainLyrics);
    if (plain.length > 0) {
      return {
        trackKey,
        found: true,
        instrumental: false,
        synced: false,
        lines: plain,
      };
    }
  }

  return {
    trackKey,
    found: false,
    instrumental: false,
    synced: false,
    lines: [],
  };
}

async function fetchJsonWithTimeout<T>(url: string, timeoutMs = 6500): Promise<{ status: number; data: T | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Lrclib-Client': 'Spotify Mini Chrome Extension/1.0.0',
      },
      signal: controller.signal,
    });
    if (!response.ok) {
      return { status: response.status, data: null };
    }
    const data = (await response.json()) as T;
    return { status: response.status, data };
  } finally {
    clearTimeout(timer);
  }
}

async function queryLrclibNetwork(
  request: LrclibLookupRequest
): Promise<LrclibLookupResult> {
  const title = request.title.trim();
  const artist = primaryArtistName(request.artist);
  if (!title || !artist) {
    return {
      trackKey: request.trackKey,
      found: false,
      instrumental: false,
      synced: false,
      lines: [],
    };
  }

  try {
    // 1. Direct exact /api/get lookup
    const getParams = new URLSearchParams({
      track_name: title,
      artist_name: artist,
    });
    if (request.album?.trim()) {
      getParams.set('album_name', request.album.trim());
    }
    if (request.durationSec && request.durationSec > 0) {
      getParams.set('duration', String(Math.round(request.durationSec)));
    }

    const directRes = await fetchJsonWithTimeout<LrclibRecord>(
      `${LRCLIB_BASE}/get?${getParams.toString()}`
    );
    if (directRes.status === 200 && directRes.data) {
      const converted = recordToResult(request.trackKey, directRes.data);
      if (converted.found) return converted;
    }

    // 2. Fallback /api/search with full title + primary artist
    const searchParams = new URLSearchParams({
      track_name: title,
      artist_name: artist,
    });
    const searchRes = await fetchJsonWithTimeout<LrclibRecord[]>(
      `${LRCLIB_BASE}/search?${searchParams.toString()}`
    );
    if (searchRes.status === 200 && Array.isArray(searchRes.data)) {
      const best = pickBestCandidate(searchRes.data, request.durationSec);
      const converted = recordToResult(request.trackKey, best);
      if (converted.found) return converted;
    }

    // 3. Cleaned title fallback (strips remaster / feat suffixes)
    const cleaned = cleanTrackTitle(title);
    if (cleaned && cleaned.toLowerCase() !== title.toLowerCase()) {
      const cleanParams = new URLSearchParams({
        track_name: cleaned,
        artist_name: artist,
      });
      const cleanRes = await fetchJsonWithTimeout<LrclibRecord[]>(
        `${LRCLIB_BASE}/search?${cleanParams.toString()}`
      );
      if (cleanRes.status === 200 && Array.isArray(cleanRes.data)) {
        const best = pickBestCandidate(cleanRes.data, request.durationSec);
        const converted = recordToResult(request.trackKey, best);
        if (converted.found) return converted;
      }
    }

    return {
      trackKey: request.trackKey,
      found: false,
      instrumental: false,
      synced: false,
      lines: [],
    };
  } catch (err) {
    return {
      trackKey: request.trackKey,
      found: false,
      instrumental: false,
      synced: false,
      lines: [],
      error: err instanceof Error ? err.message : 'LRCLIB lookup failed',
    };
  }
}

export async function fetchLrclibLyrics(
  request: LrclibLookupRequest
): Promise<LrclibLookupResult> {
  const cacheKey = normalizeCacheKey(request);
  const now = Date.now();

  if (!request.forceRefresh) {
    const memEntry = memoryCache.get(cacheKey);
    if (memEntry) {
      const ttl = memEntry.result.found ? HIT_TTL_MS : MISS_TTL_MS;
      if (now - memEntry.cachedAt < ttl) {
        return { ...memEntry.result, trackKey: request.trackKey };
      }
    }

    const storageCache = await readStorageCache();
    const storedEntry = storageCache[cacheKey];
    if (storedEntry) {
      const ttl = storedEntry.result.found ? HIT_TTL_MS : MISS_TTL_MS;
      if (now - storedEntry.cachedAt < ttl) {
        memoryCache.set(cacheKey, storedEntry);
        return { ...storedEntry.result, trackKey: request.trackKey };
      }
    }
  }

  const inflight = inflightRequests.get(cacheKey);
  if (inflight) {
    const res = await inflight;
    return { ...res, trackKey: request.trackKey };
  }

  const promise = queryLrclibNetwork(request).then(async (result) => {
    const entry: CachedLyricsEntry = { result, cachedAt: Date.now() };
    memoryCache.set(cacheKey, entry);
    if (!result.error) {
      await writeStorageCache(cacheKey, entry);
    }
    inflightRequests.delete(cacheKey);
    return result;
  });

  inflightRequests.set(cacheKey, promise);
  return promise;
}
