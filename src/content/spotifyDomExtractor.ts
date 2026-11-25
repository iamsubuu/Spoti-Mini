import type {
  DomLyricsPayload,
  PlayerCommand,
  RawSpotifyDomState,
} from '../types/extension';

/**
 * Parses Spotify timestamp text like "1:23", "1:02:15", or "-2:10".
 */
export function parseTimeText(raw: string | null | undefined): {
  seconds: number;
  isRemaining: boolean;
} | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const isRemaining = trimmed.startsWith('-');
  const clean = trimmed.replace(/^[-+]/, '').trim();
  const parts = clean.split(':').map((p) => Number(p.trim()));
  if (parts.some((n) => Number.isNaN(n) || n < 0)) return null;

  if (parts.length === 2) {
    return { seconds: parts[0] * 60 + parts[1], isRemaining };
  }
  if (parts.length === 3) {
    return {
      seconds: parts[0] * 3600 + parts[1] * 60 + parts[2],
      isRemaining,
    };
  }
  return null;
}

function getElementText(el: Element | null): string {
  return el?.textContent?.trim() ?? '';
}

function parseRgbLuminanceScore(colorStr: string): number {
  const match = colorStr.match(
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/i
  );
  if (!match) return 0;
  const r = Number(match[1]);
  const g = Number(match[2]);
  const b = Number(match[3]);
  const a = match[4] !== undefined ? Number(match[4]) : 1;
  // Relative luminance weighted by alpha
  return ((0.2126 * r + 0.7152 * g + 0.0722 * b) / 255) * a;
}

/**
 * Reads Spotify's rendered lyrics DOM when open/accessible on the page.
 */
export function extractDomLyrics(
  doc: Document,
  trackKey: string,
  win?: Window
): DomLyricsPayload | null {
  const lineNodes = Array.from(
    doc.querySelectorAll('[data-testid="lyrics-line"]')
  );
  if (lineNodes.length === 0) return null;

  const lines: string[] = [];
  const scores: number[] = [];
  let explicitActiveIdx = -1;

  for (let i = 0; i < lineNodes.length; i++) {
    const node = lineNodes[i];
    const text = node.textContent?.trim() ?? '';
    if (!text) continue;

    const currentIdx = lines.length;
    lines.push(text);

    if (
      node.getAttribute('aria-current') === 'true' ||
      node.getAttribute('data-active') === 'true'
    ) {
      explicitActiveIdx = currentIdx;
    }

    if (win) {
      const targetEl = (node.firstElementChild ?? node) as Element;
      const color = win.getComputedStyle(targetEl).color;
      scores.push(parseRgbLuminanceScore(color));
    } else {
      scores.push(0);
    }
  }

  if (lines.length === 0) return null;

  let activeIndex = explicitActiveIdx;
  if (activeIndex < 0 && scores.length > 0) {
    let maxScore = -1;
    let maxIdx = -1;
    let minScore = Infinity;
    for (let i = 0; i < scores.length; i++) {
      if (scores[i] > maxScore) {
        maxScore = scores[i];
        maxIdx = i;
      }
      if (scores[i] < minScore) {
        minScore = scores[i];
      }
    }
    // Only pick highlighted line when there is a meaningful contrast difference
    if (maxIdx >= 0 && maxScore - minScore > 0.12) {
      activeIndex = maxIdx;
    }
  }

  return {
    trackKey,
    lines,
    activeIndex,
  };
}

function readSliderValues(container: Element | null): {
  value: number | null;
  max: number | null;
} {
  if (!container) return { value: null, max: null };
  const input = container.querySelector('input[type="range"]') as HTMLInputElement | null;
  if (input) {
    const value = Number(input.value);
    const max = Number(input.max);
    return {
      value: Number.isFinite(value) ? value : null,
      max: Number.isFinite(max) && max > 0 ? max : null,
    };
  }
  const slider = container.matches('[role="slider"]')
    ? container
    : container.querySelector('[role="slider"]');
  if (slider) {
    const value = Number(slider.getAttribute('aria-valuenow'));
    const max = Number(slider.getAttribute('aria-valuemax'));
    return {
      value: Number.isFinite(value) ? value : null,
      max: Number.isFinite(max) && max > 0 ? max : null,
    };
  }
  return { value: null, max: null };
}

function pickBestMediaSessionArtwork(
  nav?: Navigator
): string | null {
  const artwork = nav?.mediaSession?.metadata?.artwork;
  if (!artwork || artwork.length === 0) return null;
  let best = artwork[0];
  let bestSize = 0;
  for (const item of artwork) {
    const sizeMatch = item.sizes?.match(/^(\d+)x(\d+)$/);
    const px = sizeMatch ? Number(sizeMatch[1]) * Number(sizeMatch[2]) : 0;
    if (px >= bestSize && item.src) {
      bestSize = px;
      best = item;
    }
  }
  return best?.src || null;
}

/**
 * Extracts live track metadata, playback status, progress, volume, and rendered lyrics
 * purely from accessible page metadata and semantic DOM elements.
 */
export function extractSpotifyDomState(
  doc: Document,
  nav: Navigator = navigator,
  win: Window = window
): RawSpotifyDomState {
  const nowPlayingBar = doc.querySelector(
    '[data-testid="now-playing-bar"], footer[data-testid="now-playing-bar"], footer'
  );
  const nowPlayingWidget = doc.querySelector('[data-testid="now-playing-widget"]');
  const playPauseBtn = doc.querySelector('[data-testid="control-button-playpause"]');
  const hasPlayerControls = Boolean(playPauseBtn || nowPlayingBar);

  // Title extraction
  const titleLink = doc.querySelector(
    '[data-testid="context-item-info-title"] a, [data-testid="now-playing-widget"] a[href*="/track/"], [data-testid="now-playing-widget"] a[href*="/episode/"]'
  ) as HTMLAnchorElement | null;
  const titleEl =
    titleLink ?? doc.querySelector('[data-testid="context-item-info-title"]');
  let title = getElementText(titleEl);
  if (!title && nav.mediaSession?.metadata?.title) {
    title = nav.mediaSession.metadata.title.trim();
  }

  // Artist extraction
  const artistLinks = Array.from(
    doc.querySelectorAll(
      '[data-testid="context-item-info-subtitles"] a, [data-testid="context-item-info-artist"] a, [data-testid="now-playing-widget"] a[href*="/artist/"]'
    )
  );
  let artist = artistLinks
    .map((el) => getElementText(el))
    .filter(Boolean)
    .join(', ');
  if (!artist) {
    artist = getElementText(
      doc.querySelector('[data-testid="context-item-info-subtitles"], [data-testid="context-item-info-artist"]')
    );
  }
  if (!artist && nav.mediaSession?.metadata?.artist) {
    artist = nav.mediaSession.metadata.artist.trim();
  }

  // Album extraction
  const albumLink = doc.querySelector(
    '[data-testid="now-playing-widget"] a[href*="/album/"]'
  );
  const album =
    nav.mediaSession?.metadata?.album?.trim() ||
    getElementText(albumLink) ||
    'Spotify Web';

  // Artwork URL
  const coverImg = doc.querySelector(
    '[data-testid="cover-art-image"], [data-testid="now-playing-widget"] img'
  ) as HTMLImageElement | null;
  const artworkUrl =
    coverImg?.currentSrc ||
    coverImg?.src ||
    pickBestMediaSessionArtwork(nav) ||
    null;

  const spotifyTrackUrl = titleLink?.href || null;
  const hasActiveTrack = Boolean(title && (nowPlayingWidget || playPauseBtn));
  const trackKey = hasActiveTrack
    ? `${title}::${artist || 'Unknown'}::${spotifyTrackUrl ?? ''}`
    : '';

  // Play/Pause state
  const playAria = (playPauseBtn?.getAttribute('aria-label') ?? '').toLowerCase();
  let isPlaying = false;
  if (playAria) {
    if (playAria.includes('pause')) {
      isPlaying = true;
    } else if (playAria.includes('play')) {
      isPlaying = false;
    } else {
      isPlaying = nav.mediaSession?.playbackState === 'playing';
    }
  } else {
    isPlaying = nav.mediaSession?.playbackState === 'playing';
  }

  // Progress & duration
  const posText = getElementText(doc.querySelector('[data-testid="playback-position"]'));
  const durText = getElementText(doc.querySelector('[data-testid="playback-duration"]'));
  const parsedPos = parseTimeText(posText);
  const parsedDur = parseTimeText(durText);
  const sliderVals = readSliderValues(
    doc.querySelector('[data-testid="playback-progressbar"]')
  );

  let currentTimeSec = parsedPos?.seconds ?? 0;
  let durationSec = 0;

  if (parsedDur) {
    if (parsedDur.isRemaining) {
      durationSec = currentTimeSec + parsedDur.seconds;
    } else {
      durationSec = parsedDur.seconds;
    }
  }

  if (sliderVals.max !== null && sliderVals.value !== null) {
    // Spotify sometimes exposes ms instead of s on aria-valuemax
    const isMs =
      (durationSec > 0 && sliderVals.max > durationSec * 50) ||
      sliderVals.max > 36000;
    const sliderMaxSec = isMs ? sliderVals.max / 1000 : sliderVals.max;
    const sliderValSec = isMs ? sliderVals.value / 1000 : sliderVals.value;
    if (durationSec <= 0 && sliderMaxSec > 0) {
      durationSec = Math.round(sliderMaxSec);
    }
    if (sliderValSec >= 0) {
      if (!parsedPos) {
        currentTimeSec = isMs ? Number(sliderValSec.toFixed(2)) : Math.round(sliderValSec);
      } else if (isMs && Math.abs(sliderValSec - parsedPos.seconds) < 1.5) {
        // Preserve sub-second precision from millisecond slider when aligned with text display
        currentTimeSec = Number(sliderValSec.toFixed(2));
      }
    }
  }

  // Volume & Mute
  const volumeContainer = doc.querySelector('[data-testid="volume-bar"]');
  const volumeVals = readSliderValues(volumeContainer);
  let volume = 75;
  if (volumeVals.value !== null) {
    const max = volumeVals.max ?? 1;
    volume = Math.round((volumeVals.value / max) * 100);
    volume = Math.max(0, Math.min(100, volume));
  }
  const muteBtn = doc.querySelector('[data-testid="volume-bar-toggle-mute-button"]');
  const muteLabel = (muteBtn?.getAttribute('aria-label') ?? '').toLowerCase();
  const isMuted =
    muteLabel.includes('unmute') || (volumeVals.value !== null && volume === 0);

  // Like / Save status
  const addBtn =
    doc.querySelector('[data-testid="now-playing-widget"] [data-testid="add-button"]') ??
    doc.querySelector('[data-testid="now-playing-widget"] button[aria-checked]');
  const addChecked = addBtn?.getAttribute('aria-checked');
  const addLabel = (addBtn?.getAttribute('aria-label') ?? '').toLowerCase();
  const isLiked =
    addChecked === 'true' ||
    addLabel.includes('remove') ||
    addLabel.includes('saved');

  // Shuffle & Repeat
  const shuffleBtn = doc.querySelector('[data-testid="control-button-shuffle"]');
  const shuffle = shuffleBtn?.getAttribute('aria-checked') === 'true';

  const repeatBtn = doc.querySelector('[data-testid="control-button-repeat"]');
  const repeatChecked = repeatBtn?.getAttribute('aria-checked');
  const repeatLabel = (repeatBtn?.getAttribute('aria-label') ?? '').toLowerCase();
  let repeat: 'off' | 'all' | 'one' = 'off';
  if (repeatChecked === 'mixed' || repeatLabel.includes('disable repeat')) {
    repeat = 'one';
  } else if (repeatChecked === 'true' || repeatLabel.includes('repeat one')) {
    repeat = 'all';
  }

  const domLyrics = hasActiveTrack ? extractDomLyrics(doc, trackKey, win) : null;
  const hasSpotifyLyricsButton = Boolean(
    doc.querySelector('[data-testid="lyrics-button"]')
  );

  return {
    hasPlayerControls,
    hasActiveTrack,
    trackKey,
    title,
    artist: artist || (hasActiveTrack ? 'Unknown Artist' : ''),
    album,
    artworkUrl,
    spotifyTrackUrl,
    durationSec,
    currentTimeSec,
    isPlaying,
    volume,
    isMuted,
    isLiked,
    shuffle,
    repeat,
    domLyrics,
    hasSpotifyLyricsButton,
    pipSupported:
      'documentPictureInPicture' in win &&
      typeof (win as Window & { documentPictureInPicture?: { requestWindow?: unknown } })
        .documentPictureInPicture?.requestWindow === 'function',
    pageUrl: win.location?.href ?? 'https://open.spotify.com/',
  };
}

function setRangeSliderRatio(
  doc: Document,
  containerSelector: string,
  ratio: number
): boolean {
  const container = doc.querySelector(containerSelector);
  if (!container) return false;

  const clampedRatio = Math.max(0, Math.min(1, ratio));

  // 1. Update hidden/visible <input type="range"> if present
  const rangeInput = container.querySelector(
    'input[type="range"]'
  ) as HTMLInputElement | null;
  if (rangeInput) {
    const min = Number(rangeInput.min || 0);
    const max = Number(rangeInput.max || 1);
    const nextValue = min + clampedRatio * (max - min);
    const descriptor = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value'
    );
    descriptor?.set?.call(rangeInput, String(nextValue));
    rangeInput.dispatchEvent(new Event('input', { bubbles: true }));
    rangeInput.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // 2. Dispatch realistic pointer & mouse events along visible progress bar track
  const target = (container.querySelector('[data-testid="progress-bar"]') ??
    container.querySelector('[role="slider"]') ??
    container) as HTMLElement;

  const rect = target.getBoundingClientRect();
  if (rect.width > 0 && rect.height > 0) {
    const clientX = rect.left + clampedRatio * rect.width;
    const clientY = rect.top + rect.height / 2;
    const eventInit: PointerEventInit = {
      bubbles: true,
      cancelable: true,
      clientX,
      clientY,
      button: 0,
      buttons: 1,
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
    };

    target.dispatchEvent(new PointerEvent('pointerdown', eventInit));
    target.dispatchEvent(new MouseEvent('mousedown', eventInit));
    target.dispatchEvent(new PointerEvent('pointermove', eventInit));
    target.dispatchEvent(new MouseEvent('mousemove', eventInit));
    target.dispatchEvent(
      new PointerEvent('pointerup', { ...eventInit, buttons: 0 })
    );
    target.dispatchEvent(
      new MouseEvent('mouseup', { ...eventInit, buttons: 0 })
    );
    target.dispatchEvent(new MouseEvent('click', { ...eventInit, buttons: 0 }));
    return true;
  }

  return Boolean(rangeInput);
}

/**
 * Dispatches safe user-style interactions onto visible Spotify Web Player DOM controls.
 */
export function executePlayerCommand(
  doc: Document,
  command: PlayerCommand
): { ok: boolean; error?: string } {
  const clickButton = (selector: string, label: string) => {
    const el = doc.querySelector(selector) as HTMLElement | null;
    if (!el) {
      return { ok: false, error: `${label} control not found on Spotify Web.` };
    }
    if ((el as HTMLButtonElement).disabled || el.getAttribute('aria-disabled') === 'true') {
      return { ok: false, error: `${label} control is currently unavailable.` };
    }
    el.click();
    return { ok: true };
  };

  switch (command.type) {
    case 'togglePlay':
      return clickButton('[data-testid="control-button-playpause"]', 'Play/Pause');
    case 'nextTrack':
      return clickButton('[data-testid="control-button-skip-forward"]', 'Next track');
    case 'prevTrack':
      return clickButton('[data-testid="control-button-skip-back"]', 'Previous track');
    case 'toggleMute':
      return clickButton('[data-testid="volume-bar-toggle-mute-button"]', 'Mute');
    case 'toggleLike': {
      const btn =
        (doc.querySelector(
          '[data-testid="now-playing-widget"] [data-testid="add-button"]'
        ) as HTMLElement | null) ??
        (doc.querySelector(
          '[data-testid="now-playing-widget"] button[aria-checked]'
        ) as HTMLElement | null);
      if (!btn) {
        return { ok: false, error: 'Save/Like control not found.' };
      }
      btn.click();
      return { ok: true };
    }
    case 'toggleShuffle':
      return clickButton('[data-testid="control-button-shuffle"]', 'Shuffle');
    case 'cycleRepeat':
      return clickButton('[data-testid="control-button-repeat"]', 'Repeat');
    case 'openSpotifyLyrics':
      return clickButton('[data-testid="lyrics-button"]', 'Spotify Lyrics');
    case 'seekTo': {
      const durText = getElementText(doc.querySelector('[data-testid="playback-duration"]'));
      const posText = getElementText(doc.querySelector('[data-testid="playback-position"]'));
      const parsedDur = parseTimeText(durText);
      const parsedPos = parseTimeText(posText);
      let durationSec = 0;
      if (parsedDur) {
        durationSec = parsedDur.isRemaining
          ? (parsedPos?.seconds ?? 0) + parsedDur.seconds
          : parsedDur.seconds;
      }
      if (durationSec <= 0) {
        const slider = readSliderValues(
          doc.querySelector('[data-testid="playback-progressbar"]')
        );
        if (slider.max && slider.max > 0) {
          durationSec = slider.max > 36000 ? slider.max / 1000 : slider.max;
        }
      }
      if (durationSec <= 0) {
        return { ok: false, error: 'Track duration unavailable for seeking.' };
      }
      const ok = setRangeSliderRatio(
        doc,
        '[data-testid="playback-progressbar"]',
        command.timeSec / durationSec
      );
      return ok ? { ok: true } : { ok: false, error: 'Seek bar not available.' };
    }
    case 'setVolume': {
      const ok = setRangeSliderRatio(
        doc,
        '[data-testid="volume-bar"]',
        command.volume / 100
      );
      return ok ? { ok: true } : { ok: false, error: 'Volume bar not available.' };
    }
    case 'clickSpotifyLyricLine': {
      const lines = Array.from(
        doc.querySelectorAll('[data-testid="lyrics-line"]')
      ).filter((el) => Boolean(el.textContent?.trim()));
      const target = lines[command.index] as HTMLElement | undefined;
      if (!target) {
        return { ok: false, error: 'Spotify lyric line not currently visible.' };
      }
      target.click();
      return { ok: true };
    }
  }
}
