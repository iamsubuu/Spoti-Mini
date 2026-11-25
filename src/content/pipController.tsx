import React, { useEffect, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type {
  FloatingDisplayMode,
  LyricsLoadStatus,
  PlaybackActions,
  PlaybackState,
  PlayerSettings,
  Track,
} from '../types/player';
import { CombinedPlayerLyricsView } from '../components/views/CombinedPlayerLyricsView';
import { FloatingLyricsView } from '../components/views/FloatingLyricsView';
import { FloatingMiniPlayer } from '../components/views/FloatingMiniPlayer';
import { GlassArtworkBackdrop } from '../components/ui/GlassArtworkBackdrop';

interface DocumentPipApi {
  window: Window | null;
  requestWindow(options?: {
    width?: number;
    height?: number;
    disallowReturnToOpener?: boolean;
  }): Promise<Window>;
}

declare global {
  interface Window {
    documentPictureInPicture?: DocumentPipApi;
  }
}

export interface PipControllerState {
  track: Track;
  playback: PlaybackState;
  actions: PlaybackActions;
  settings: PlayerSettings;
  lyricsStatus: LyricsLoadStatus;
  mode: FloatingDisplayMode;
}

const MODE_DIMENSIONS: Record<
  FloatingDisplayMode,
  { normal: [number, number]; compact: [number, number] }
> = {
  'mini-horizontal': { normal: [488, 178], compact: [420, 158] },
  'mini-vertical': { normal: [292, 446], compact: [264, 392] },
  lyrics: { normal: [444, 584], compact: [400, 514] },
  combined: { normal: [676, 496], compact: [656, 472] },
};

const PipWindowApp: React.FC<{
  state: PipControllerState;
  onChangeMode: (mode: FloatingDisplayMode) => void;
  onClose: () => void;
}> = ({ state, onChangeMode, onClose }) => {
  const { track, playback, actions, settings, lyricsStatus, mode } = state;
  const isLight = settings.theme === 'light';

  useEffect(() => {
    const ownerDoc = window.__spotifyMiniPipDoc ?? document;
    const root = ownerDoc.documentElement;
    if (settings.theme === 'obsidian') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', settings.theme);
    }
    if (settings.theme === 'light') {
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
    }
  }, [settings.theme]);

  return (
    <div className="relative h-screen w-screen overflow-hidden flex flex-col items-center justify-center p-2.5 bg-[var(--bg-stage)] text-[var(--text-primary)] select-none">
      {/* Live Blurred Album-Art Vibrancy Canvas for macOS Frosted Glass */}
      <GlassArtworkBackdrop artwork={track.artwork} isLight={isLight} intense />

      <div className="relative z-10 w-full flex-1 min-h-0 flex flex-col items-center justify-center">
        {/* macOS Frosted Mode Switcher Dock */}
        <div
          className={`w-full shrink-0 flex justify-end mb-2 ${
            mode === 'mini-horizontal'
              ? settings.compactMode
                ? 'max-w-[396px]'
                : 'max-w-[464px]'
              : mode === 'mini-vertical'
                ? settings.compactMode
                  ? 'max-w-[236px]'
                  : 'max-w-[264px]'
                : mode === 'lyrics'
                  ? settings.compactMode
                    ? 'max-w-[376px]'
                    : 'max-w-[420px]'
                  : 'max-w-[640px]'
          }`}
        >
          <div className="mac-glass-dock inline-flex items-center gap-0.5 p-1 rounded-full">
            {(
              [
                ['mini-horizontal', 'Bar'],
                ['mini-vertical', 'Card'],
                ['lyrics', 'Lyrics'],
                ['combined', 'Combined'],
              ] as [FloatingDisplayMode, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => onChangeMode(id)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-[background-color,color,box-shadow] duration-150 cursor-pointer whitespace-nowrap ${
                  mode === id
                    ? 'bg-[var(--surface-active)] text-[var(--text-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {mode === 'mini-horizontal' && (
          <FloatingMiniPlayer
            track={track}
            playback={playback}
            actions={actions}
            settings={settings}
            layout="horizontal"
            onToggleLayout={() => onChangeMode('mini-vertical')}
            onToggleLyrics={() => onChangeMode('lyrics')}
            onClose={onClose}
            elevated
          />
        )}

        {mode === 'mini-vertical' && (
          <FloatingMiniPlayer
            track={track}
            playback={playback}
            actions={actions}
            settings={settings}
            layout="vertical"
            onToggleLayout={() => onChangeMode('mini-horizontal')}
            onToggleLyrics={() => onChangeMode('lyrics')}
            onClose={onClose}
            elevated
          />
        )}

        {mode === 'lyrics' && (
          <FloatingLyricsView
            track={track}
            playback={playback}
            actions={actions}
            settings={settings}
            lyricsStatus={lyricsStatus}
            onSwitchToMiniPlayer={() => onChangeMode('mini-horizontal')}
            onClose={onClose}
            elevated
            fillViewport
          />
        )}

        {mode === 'combined' && (
          <CombinedPlayerLyricsView
            track={track}
            playback={playback}
            actions={actions}
            settings={settings}
            lyricsStatus={lyricsStatus}
            sizePreset="medium"
            onSwitchToMiniPlayer={() => onChangeMode('mini-horizontal')}
            onClose={onClose}
            elevated
            fillViewport
          />
        )}
      </div>
    </div>
  );
};

declare global {
  interface Window {
    __spotifyMiniPipDoc?: Document;
  }
}

export class DocumentPipController {
  private pipWin: Window | null = null;
  private pipRoot: Root | null = null;
  private latestState: PipControllerState | null = null;
  private onStateChange: (isOpen: boolean, mode: FloatingDisplayMode, error?: string | null) => void;
  private cachedCssText: string | null = null;

  constructor(
    onStateChange: (
      isOpen: boolean,
      mode: FloatingDisplayMode,
      error?: string | null
    ) => void
  ) {
    this.onStateChange = onStateChange;
  }

  public isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'documentPictureInPicture' in window &&
      typeof window.documentPictureInPicture?.requestWindow === 'function'
    );
  }

  public isOpen(): boolean {
    return Boolean(this.pipWin && !this.pipWin.closed);
  }

  private async ensureStylesInPip(pipDoc: Document, pipWin: Window): Promise<void> {
    const cssUrl = chrome.runtime.getURL('pip.css');

    // Primary: <link rel="stylesheet"> pointing to extension web_accessible_resource
    const link = pipDoc.createElement('link');
    link.rel = 'stylesheet';
    link.href = cssUrl;
    pipDoc.head.appendChild(link);

    // Secondary resilient fallback: constructable CSSStyleSheet (works even if <link> is blocked by host CSP)
    try {
      if (!this.cachedCssText) {
        const resp = await fetch(cssUrl);
        if (resp.ok) {
          this.cachedCssText = await resp.text();
        }
      }
      if (this.cachedCssText && 'CSSStyleSheet' in pipWin) {
        const PipCSSStyleSheet = (pipWin as unknown as { CSSStyleSheet: typeof CSSStyleSheet }).CSSStyleSheet;
        const sheet = new PipCSSStyleSheet();
        sheet.replaceSync(this.cachedCssText);
        pipDoc.adoptedStyleSheets = [...pipDoc.adoptedStyleSheets, sheet];
      }
    } catch {
      // <link> stylesheet remains attached.
    }
  }

  private applyTheme(pipDoc: Document, theme: PlayerSettings['theme']): void {
    const root = pipDoc.documentElement;
    if (theme === 'obsidian') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', theme);
    }
    if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
    }
  }

  public async open(state: PipControllerState): Promise<{ ok: boolean; error?: string }> {
    if (!this.isSupported()) {
      const msg =
        'Chrome Document Picture-in-Picture is not supported in this browser (requires Chrome 116+).';
      this.onStateChange(false, state.mode, msg);
      return { ok: false, error: msg };
    }

    this.latestState = state;

    if (this.isOpen() && this.pipWin) {
      this.pipWin.focus();
      this.render();
      return { ok: true };
    }

    const [width, height] = state.settings.compactMode
      ? MODE_DIMENSIONS[state.mode].compact
      : MODE_DIMENSIONS[state.mode].normal;

    try {
      const pipWin = await window.documentPictureInPicture!.requestWindow({
        width,
        height,
        disallowReturnToOpener: true,
      });

      this.pipWin = pipWin;
      const pipDoc = pipWin.document;
      pipDoc.title = `${state.track.title} — Spotify Mini`;
      this.applyTheme(pipDoc, state.settings.theme);

      // Add font stylesheet link if allowed (fails gracefully to system fonts if offline/CSP)
      const fontLink = pipDoc.createElement('link');
      fontLink.rel = 'stylesheet';
      fontLink.href =
        'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Plus+Jakarta+Sans:wght@500;600;700&display=swap';
      pipDoc.head.appendChild(fontLink);

      await this.ensureStylesInPip(pipDoc, pipWin);

      pipDoc.body.style.margin = '0';
      pipDoc.body.style.padding = '0';
      pipDoc.body.style.overflow = 'hidden';

      const mount = pipDoc.createElement('div');
      mount.id = 'spotify-mini-pip-root';
      pipDoc.body.appendChild(mount);

      (window as Window).__spotifyMiniPipDoc = pipDoc;
      this.pipRoot = createRoot(mount);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (!this.latestState) return;
        const target = e.target as HTMLElement | null;
        if (
          target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable)
        ) {
          return;
        }
        const { actions, playback, mode } = this.latestState;
        if (e.code === 'Space' && target?.tagName !== 'BUTTON') {
          e.preventDefault();
          actions.togglePlay();
        } else if (e.key === 'm' || e.key === 'M') {
          actions.toggleMute();
        } else if (e.key === 'l' || e.key === 'L') {
          this.setMode(mode === 'lyrics' ? 'mini-horizontal' : 'lyrics');
        } else if (e.key === 'ArrowRight' && e.shiftKey) {
          e.preventDefault();
          actions.seekTo(playback.currentTimeSec + 10);
        } else if (e.key === 'ArrowLeft' && e.shiftKey) {
          e.preventDefault();
          actions.seekTo(Math.max(0, playback.currentTimeSec - 10));
        } else if (e.key === 'Escape') {
          this.close();
        }
      };

      pipWin.addEventListener('keydown', handleKeyDown);
      pipWin.addEventListener('pagehide', () => {
        this.cleanup();
        this.onStateChange(false, this.latestState?.mode ?? state.mode, null);
      });

      this.render();
      this.onStateChange(true, state.mode, null);
      return { ok: true };
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to open Document Picture-in-Picture window.';
      this.cleanup();
      this.onStateChange(false, state.mode, msg);
      return { ok: false, error: msg };
    }
  }

  public setMode(mode: FloatingDisplayMode): void {
    if (!this.latestState) return;
    this.latestState = { ...this.latestState, mode };
    if (this.pipWin && !this.pipWin.closed) {
      const [w, h] = this.latestState.settings.compactMode
        ? MODE_DIMENSIONS[mode].compact
        : MODE_DIMENSIONS[mode].normal;
      try {
        this.pipWin.resizeTo(w, h);
      } catch {
        // Browsers may restrict programmatic resize in some contexts.
      }
      this.render();
    }
    this.onStateChange(this.isOpen(), mode, null);
  }

  public update(state: PipControllerState): void {
    this.latestState = state;
    if (this.isOpen() && this.pipWin) {
      this.pipWin.document.title = `${state.track.title} — Spotify Mini`;
      this.applyTheme(this.pipWin.document, state.settings.theme);
      this.render();
    }
  }

  private render(): void {
    if (!this.pipRoot || !this.latestState) return;
    const current = this.latestState;
    this.pipRoot.render(
      <React.StrictMode>
        <PipWindowApp
          state={current}
          onChangeMode={(nextMode) => this.setMode(nextMode)}
          onClose={() => this.close()}
        />
      </React.StrictMode>
    );
  }

  public close(): void {
    const win = this.pipWin;
    const mode = this.latestState?.mode ?? 'mini-horizontal';
    this.cleanup();
    if (win && !win.closed) {
      try {
        win.close();
      } catch {
        // Ignore close errors.
      }
    }
    this.onStateChange(false, mode, null);
  }

  private cleanup(): void {
    if (this.pipRoot) {
      try {
        this.pipRoot.unmount();
      } catch {
        // Ignore unmount errors when window already tore down.
      }
      this.pipRoot = null;
    }
    this.pipWin = null;
    delete (window as Window).__spotifyMiniPipDoc;
  }
}

/**
 * Isolated Shadow DOM launcher controls injected on open.spotify.com:
 * 1) A compact Spotify Mini button in Spotify's player bar.
 * 2) An optional one-click launch banner when triggered from the extension popup.
 */
export function mountSpotifyPageLauncher(callbacks: {
  onLaunchClick: () => void;
  onDismissBanner: () => void;
}) {
  const HOST_ID = 'spotify-mini-launcher-host';
  let host = document.getElementById(HOST_ID);
  if (!host) {
    host = document.createElement('div');
    host.id = HOST_ID;
    document.body.appendChild(host);
  }

  const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
  shadow.innerHTML = '';

  const style = document.createElement('style');
  style.textContent = `
    .mini-fab {
      position: fixed;
      bottom: 94px;
      right: 18px;
      z-index: 999998;
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 7px 13px;
      border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.22);
      background: linear-gradient(145deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02)), rgba(22, 25, 31, 0.62);
      color: #f5f6f8;
      font-family: "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 14px 32px -8px rgba(0,0,0,0.68), inset 0 1px 0 rgba(255,255,255,0.24);
      backdrop-filter: blur(28px) saturate(180%);
      -webkit-backdrop-filter: blur(28px) saturate(180%);
      transition: transform 140ms ease, background-color 140ms ease, border-color 140ms ease;
    }
    .mini-fab:hover {
      background: linear-gradient(145deg, rgba(255,255,255,0.16), rgba(255,255,255,0.04)), rgba(30, 34, 42, 0.72);
      border-color: rgba(255, 255, 255, 0.34);
      transform: translateY(-1px);
    }
    .mini-fab.active {
      border-color: rgba(29, 185, 84, 0.7);
      color: #1db954;
    }
    .mini-banner {
      position: fixed;
      top: 18px;
      right: 18px;
      z-index: 999999;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      border-radius: 16px;
      border: 1px solid rgba(255, 255, 255, 0.22);
      background: linear-gradient(145deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02)), rgba(22, 25, 31, 0.66);
      color: #f5f6f8;
      font-family: "DM Sans", -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 13px;
      box-shadow: 0 20px 48px -10px rgba(0, 0, 0, 0.72), inset 0 1px 0 rgba(255,255,255,0.25);
      backdrop-filter: blur(32px) saturate(185%);
      -webkit-backdrop-filter: blur(32px) saturate(185%);
    }
    .mini-banner-btn {
      padding: 6px 12px;
      border-radius: 9px;
      border: none;
      background: #1db954;
      color: #07140b;
      font-weight: 600;
      font-size: 12.5px;
      cursor: pointer;
      white-space: nowrap;
    }
    .mini-banner-btn:hover {
      background: #1ed760;
    }
    .mini-banner-close {
      background: transparent;
      border: none;
      color: #a1a7b3;
      font-size: 16px;
      line-height: 1;
      cursor: pointer;
      padding: 2px 4px;
    }
    .mini-banner-close:hover {
      color: #f4f5f7;
    }
  `;
  shadow.appendChild(style);

  const fab = document.createElement('button');
  fab.type = 'button';
  fab.className = 'mini-fab';
  fab.title = 'Open Spotify Mini Floating Player (Document PiP)';
  fab.innerHTML = `
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect width="24" height="24" rx="7" fill="#1db954"/>
      <path d="M6.8 9.4C10.1 8.4 14.2 8.6 17.3 10.3" stroke="#07140b" stroke-width="1.9" stroke-linecap="round"/>
      <path d="M7.8 12.6C10.5 11.9 13.7 12.1 16.2 13.4" stroke="#07140b" stroke-width="1.7" stroke-linecap="round"/>
      <path d="M8.8 15.6C10.9 15.1 13.2 15.3 15.1 16.3" stroke="#07140b" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
    <span class="label">Mini Player</span>
  `;
  fab.addEventListener('click', callbacks.onLaunchClick);
  shadow.appendChild(fab);

  const banner = document.createElement('div');
  banner.className = 'mini-banner';
  banner.style.display = 'none';
  banner.innerHTML = `
    <span>Click to open always-on-top Floating Player</span>
    <button type="button" class="mini-banner-btn">Launch Floating</button>
    <button type="button" class="mini-banner-close" aria-label="Dismiss">×</button>
  `;
  banner
    .querySelector('.mini-banner-btn')!
    .addEventListener('click', callbacks.onLaunchClick);
  banner
    .querySelector('.mini-banner-close')!
    .addEventListener('click', callbacks.onDismissBanner);
  shadow.appendChild(banner);

  return {
    update(opts: { isOpen: boolean; showPrompt: boolean; hasControls: boolean }) {
      fab.style.display = opts.hasControls ? 'inline-flex' : 'none';
      fab.classList.toggle('active', opts.isOpen);
      const labelEl = fab.querySelector('.label');
      if (labelEl) {
        labelEl.textContent = opts.isOpen ? 'Floating On' : 'Mini Player';
      }
      banner.style.display = opts.showPrompt && !opts.isOpen ? 'flex' : 'none';
    },
    destroy() {
      host?.remove();
    },
  };
}
