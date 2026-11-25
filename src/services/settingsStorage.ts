import type { PlayerSettings } from '../types/player';
import { DEFAULT_SETTINGS } from './mockPlayerAdapter';

const SETTINGS_STORAGE_KEY = 'spotifyMiniSettings';

function hasChromeStorage(): boolean {
  return (
    typeof chrome !== 'undefined' &&
    typeof chrome.storage !== 'undefined' &&
    typeof chrome.storage.local !== 'undefined'
  );
}

export function sanitizeSettings(raw: unknown): PlayerSettings {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_SETTINGS };
  }
  const obj = raw as Partial<PlayerSettings>;
  const validThemes = new Set(['obsidian', 'midnight', 'vinyl', 'light']);
  const validFontSizes = new Set(['sm', 'md', 'lg']);
  const validModes = new Set([
    'mini-horizontal',
    'mini-vertical',
    'lyrics',
    'combined',
  ]);

  return {
    theme: validThemes.has(obj.theme ?? '') ? obj.theme! : DEFAULT_SETTINGS.theme,
    lyricsFontSize: validFontSizes.has(obj.lyricsFontSize ?? '')
      ? obj.lyricsFontSize!
      : DEFAULT_SETTINGS.lyricsFontSize,
    compactMode:
      typeof obj.compactMode === 'boolean'
        ? obj.compactMode
        : DEFAULT_SETTINGS.compactMode,
    autoOpenFloating:
      typeof obj.autoOpenFloating === 'boolean'
        ? obj.autoOpenFloating
        : DEFAULT_SETTINGS.autoOpenFloating,
    defaultDisplayMode: validModes.has(obj.defaultDisplayMode ?? '')
      ? obj.defaultDisplayMode!
      : DEFAULT_SETTINGS.defaultDisplayMode,
    lrclibEnabled:
      typeof obj.lrclibEnabled === 'boolean'
        ? obj.lrclibEnabled
        : DEFAULT_SETTINGS.lrclibEnabled,
    dynamicIslandEnabled:
      typeof obj.dynamicIslandEnabled === 'boolean'
        ? obj.dynamicIslandEnabled
        : DEFAULT_SETTINGS.dynamicIslandEnabled,
  };
}

export async function loadSettings(): Promise<PlayerSettings> {
  if (hasChromeStorage()) {
    try {
      const result = await chrome.storage.local.get(SETTINGS_STORAGE_KEY);
      return sanitizeSettings(result[SETTINGS_STORAGE_KEY]);
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    return raw ? sanitizeSettings(JSON.parse(raw)) : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings: PlayerSettings): Promise<void> {
  const sanitized = sanitizeSettings(settings);
  if (hasChromeStorage()) {
    await chrome.storage.local.set({ [SETTINGS_STORAGE_KEY]: sanitized });
    return;
  }

  try {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(sanitized));
  } catch {
    // Ignore storage quota errors in non-extension mode.
  }
}

export function subscribeSettings(
  onChange: (settings: PlayerSettings) => void
): () => void {
  if (hasChromeStorage() && chrome.storage.onChanged) {
    const listener = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string
    ) => {
      if (areaName !== 'local') return;
      if (changes[SETTINGS_STORAGE_KEY]) {
        onChange(sanitizeSettings(changes[SETTINGS_STORAGE_KEY].newValue));
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }

  const onStorage = (e: StorageEvent) => {
    if (e.key === SETTINGS_STORAGE_KEY && e.newValue) {
      try {
        onChange(sanitizeSettings(JSON.parse(e.newValue)));
      } catch {
        // Ignore malformed JSON.
      }
    }
  };
  window.addEventListener('storage', onStorage);
  return () => window.removeEventListener('storage', onStorage);
}
