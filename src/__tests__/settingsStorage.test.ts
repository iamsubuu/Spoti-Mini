import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../services/mockPlayerAdapter';
import {
  loadSettings,
  sanitizeSettings,
  saveSettings,
} from '../services/settingsStorage';

describe('settingsStorage', () => {
  let memoryStore: Record<string, string> = {};

  beforeEach(() => {
    memoryStore = {};
    const storageMock: Storage = {
      get length() {
        return Object.keys(memoryStore).length;
      },
      clear: () => {
        memoryStore = {};
      },
      getItem: (k: string) => (k in memoryStore ? memoryStore[k] : null),
      key: (i: number) => Object.keys(memoryStore)[i] ?? null,
      removeItem: (k: string) => {
        delete memoryStore[k];
      },
      setItem: (k: string, v: string) => {
        memoryStore[k] = String(v);
      },
    };
    Object.defineProperty(window, 'localStorage', {
      value: storageMock,
      configurable: true,
    });
    vi.unstubAllGlobals();
  });

  it('sanitizes partial or invalid persisted settings', () => {
    const sanitized = sanitizeSettings({
      theme: 'invalid-theme',
      lyricsFontSize: 'lg',
      compactMode: true,
      lrclibEnabled: false,
    });

    expect(sanitized).toEqual({
      ...DEFAULT_SETTINGS,
      lyricsFontSize: 'lg',
      compactMode: true,
      lrclibEnabled: false,
    });
  });

  it('persists and loads settings in fallback localStorage', async () => {
    await saveSettings({
      ...DEFAULT_SETTINGS,
      theme: 'midnight',
      defaultDisplayMode: 'combined',
    });
    const loaded = await loadSettings();
    expect(loaded.theme).toBe('midnight');
    expect(loaded.defaultDisplayMode).toBe('combined');
  });

  it('persists and loads settings via chrome.storage.local when available', async () => {
    const chromeStore: Record<string, unknown> = {};
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: vi.fn(async (key: string) => ({ [key]: chromeStore[key] })),
          set: vi.fn(async (items: Record<string, unknown>) => {
            Object.assign(chromeStore, items);
          }),
        },
      },
    });

    await saveSettings({
      ...DEFAULT_SETTINGS,
      theme: 'vinyl',
      compactMode: true,
      lrclibEnabled: false,
    });
    const loaded = await loadSettings();
    expect(loaded.theme).toBe('vinyl');
    expect(loaded.compactMode).toBe(true);
    expect(loaded.lrclibEnabled).toBe(false);
  });
});
