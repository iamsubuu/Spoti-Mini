import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  LocateFixed,
  Pause,
  Play,
  Power,
  X,
} from 'lucide-react';
import type { PlayerCommand, SpotifySnapshot } from '../types/extension';
import type {
  FloatingDisplayMode,
  PlaybackActions,
  PlaybackState,
  PlayerSettings,
  Track,
} from '../types/player';
import { DEFAULT_SETTINGS, getActiveLyricIndex } from '../services/mockPlayerAdapter';
import { AlbumArt } from '../components/ui/AlbumArt';
import { BrandMark } from '../components/ui/BrandMark';
import { CombinedPlayerLyricsView } from '../components/views/CombinedPlayerLyricsView';
import { FloatingLyricsView } from '../components/views/FloatingLyricsView';
import { FloatingMiniPlayer } from '../components/views/FloatingMiniPlayer';

interface CompanionStatePayload {
  snapshot: SpotifySnapshot | null;
  settings: PlayerSettings | null;
  extensionConnected: boolean;
}

interface DesktopIslandBridge {
  getState: () => Promise<CompanionStatePayload>;
  onState: (cb: (state: CompanionStatePayload) => void) => () => void;
  resize: (width: number, height: number) => void;
  moveBy: (dx: number, dy: number) => void;
  snapCenter: () => void;
  hide: () => void;
  quit: () => void;
  sendToExtension: (message: Record<string, unknown>) => void;
}

declare global {
  interface Window {
    desktopIsland?: DesktopIslandBridge;
  }
}

const WAITING_TRACK: Track = {
  id: 'desktop-waiting',
  title: 'Spotify Mini',
  artist: 'Waiting for Spotify Web in Chrome',
  album: 'Spotify Web',
  year: new Date().getFullYear(),
  durationSec: 0,
  artwork: {
    id: 'meridian',
    ambientColor: '#1b4737',
    secondaryColor: '#4fa882',
    accentHue: 'rgba(29, 185, 84, 0.18)',
  },
  lyrics: [],
};

const EXPANDED_WINDOW_SIZE: Record<
  FloatingDisplayMode,
  { normal: [number, number]; compact: [number, number] }
> = {
  'mini-horizontal': { normal: [488, 198], compact: [420, 176] },
  'mini-vertical': { normal: [288, 456], compact: [260, 404] },
  lyrics: { normal: [444, 586], compact: [400, 516] },
  combined: { normal: [668, 496], compact: [668, 476] },
};

export const DesktopIslandApp: React.FC = () => {
  const [companion, setCompanion] = useState<CompanionStatePayload>({
    snapshot: null,
    settings: null,
    extensionConnected: false,
  });
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<FloatingDisplayMode>(
    DEFAULT_SETTINGS.defaultDisplayMode
  );
  const [interpolatedSec, setInterpolatedSec] = useState(0);
  const lastSyncPerfRef = useRef<number>(performance.now());
  const dragRef = useRef<{
    dragging: boolean;
    lastScreenX: number;
    lastScreenY: number;
    moved: boolean;
  }>({ dragging: false, lastScreenX: 0, lastScreenY: 0, moved: false });

  const settings = companion.settings ?? DEFAULT_SETTINGS;
  const snapshot = companion.snapshot;
  const hasActiveTrack = Boolean(
    companion.extensionConnected &&
      snapshot &&
      snapshot.connectionStatus === 'connected' &&
      snapshot.hasActiveTrack &&
      snapshot.track
  );

  // Force transparent document root so Electron desktop window corners stay crystal clear
  useEffect(() => {
    document.documentElement.style.setProperty('background', 'transparent', 'important');
    document.body.style.setProperty('background', 'transparent', 'important');
  }, []);

  // Sync theme attributes
  useEffect(() => {
    const root = document.documentElement;
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

  // Initial & live IPC state from Electron main WebSocket server
  useEffect(() => {
    const bridge = window.desktopIsland;
    if (!bridge) return;

    void bridge.getState().then((initial) => {
      lastSyncPerfRef.current = performance.now();
      setCompanion(initial);
      if (initial.settings?.defaultDisplayMode) {
        setMode(initial.settings.defaultDisplayMode);
      }
      if (initial.snapshot) {
        setInterpolatedSec(initial.snapshot.currentTimeSec);
      }
    });

    return bridge.onState((next) => {
      lastSyncPerfRef.current = performance.now();
      setCompanion(next);
      if (next.snapshot) {
        setInterpolatedSec(next.snapshot.currentTimeSec);
      }
    });
  }, []);

  // Sub-second 100ms clock interpolation for zero-lag desktop lyrics
  useEffect(() => {
    if (!hasActiveTrack || !snapshot?.isPlaying) {
      setInterpolatedSec(snapshot?.currentTimeSec ?? 0);
      return;
    }

    const duration = snapshot.track?.durationSec ?? 0;
    const base = snapshot.currentTimeSec;
    const timer = window.setInterval(() => {
      const elapsed = (performance.now() - lastSyncPerfRef.current) / 1000;
      const next = base + elapsed + 0.25;
      setInterpolatedSec(
        duration > 0 ? Math.min(duration, Math.max(0, next)) : Math.max(0, next)
      );
    }, 100);

    return () => window.clearInterval(timer);
  }, [hasActiveTrack, snapshot?.isPlaying, snapshot?.currentTimeSec, snapshot?.track?.durationSec]);

  // Dynamically resize transparent Electron window around active UI
  useEffect(() => {
    const bridge = window.desktopIsland;
    if (!bridge) return;

    if (!expanded) {
      bridge.resize(396, 58);
      return;
    }

    if (!hasActiveTrack) {
      bridge.resize(396, 196);
      return;
    }

    const [w, h] = settings.compactMode
      ? EXPANDED_WINDOW_SIZE[mode].compact
      : EXPANDED_WINDOW_SIZE[mode].normal;
    bridge.resize(w, h);
  }, [expanded, mode, settings.compactMode, hasActiveTrack]);

  const sendCommand = (command: PlayerCommand) => {
    window.desktopIsland?.sendToExtension({ type: 'PLAYER_COMMAND', command });
  };

  const actions: PlaybackActions = useMemo(
    () => ({
      togglePlay: () => sendCommand({ type: 'togglePlay' }),
      nextTrack: () => sendCommand({ type: 'nextTrack' }),
      prevTrack: () => sendCommand({ type: 'prevTrack' }),
      selectTrack: () => {},
      seekTo: (timeSec: number) => {
        setInterpolatedSec(timeSec);
        sendCommand({ type: 'seekTo', timeSec });
      },
      seekToLyricLine: (index: number, timeSec: number) => {
        if (timeSec >= 0) {
          setInterpolatedSec(timeSec);
          sendCommand({ type: 'seekTo', timeSec });
        } else {
          sendCommand({ type: 'clickSpotifyLyricLine', index });
        }
      },
      setVolume: (volume: number) => sendCommand({ type: 'setVolume', volume }),
      toggleMute: () => sendCommand({ type: 'toggleMute' }),
      toggleLike: () => sendCommand({ type: 'toggleLike' }),
      toggleShuffle: () => sendCommand({ type: 'toggleShuffle' }),
      cycleRepeat: () => sendCommand({ type: 'cycleRepeat' }),
      setConnectionStatus: () => {},
      setLyricsStatusOverride: () => {},
      retryLyrics: () => {
        window.desktopIsland?.sendToExtension({ type: 'REFRESH_LYRICS' });
      },
    }),
    []
  );

  // Global keyboard shortcuts inside focused desktop island
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === 'Escape' && expanded) {
        setExpanded(false);
      } else if (e.code === 'Space' && target?.tagName !== 'BUTTON') {
        e.preventDefault();
        actions.togglePlay();
      } else if (e.key === 'm' || e.key === 'M') {
        actions.toggleMute();
      } else if (e.key === 'l' || e.key === 'L') {
        setExpanded(true);
        setMode((prev) => (prev === 'lyrics' ? 'mini-horizontal' : 'lyrics'));
      } else if (e.key === 'ArrowRight' && e.shiftKey) {
        e.preventDefault();
        actions.seekTo(interpolatedSec + 10);
      } else if (e.key === 'ArrowLeft' && e.shiftKey) {
        e.preventDefault();
        actions.seekTo(Math.max(0, interpolatedSec - 10));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [actions, expanded, interpolatedSec]);

  const track = snapshot?.track ?? WAITING_TRACK;
  const playback: PlaybackState = {
    currentTrackIndex: 0,
    isPlaying: Boolean(hasActiveTrack && snapshot?.isPlaying),
    currentTimeSec: interpolatedSec,
    volume: snapshot?.volume ?? 75,
    isMuted: snapshot?.isMuted ?? false,
    isLiked: snapshot?.isLiked ?? false,
    shuffle: snapshot?.shuffle ?? false,
    repeat: snapshot?.repeat ?? 'off',
    connectionStatus: hasActiveTrack ? 'connected' : 'disconnected',
    lyricsStatusOverride: 'auto',
    activeLyricIndexOverride: snapshot?.activeLyricIndexOverride ?? null,
    hasActiveTrack,
  };

  const activeLyricIdx = getActiveLyricIndex(
    track.lyrics,
    interpolatedSec,
    playback.activeLyricIndexOverride
  );
  const activeLyricText =
    activeLyricIdx >= 0 ? track.lyrics[activeLyricIdx]?.text : null;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, input, [role="slider"]')) {
      return;
    }
    dragRef.current = {
      dragging: true,
      lastScreenX: e.screenX,
      lastScreenY: e.screenY,
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.dragging) return;
    const dx = e.screenX - dragRef.current.lastScreenX;
    const dy = e.screenY - dragRef.current.lastScreenY;
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
      dragRef.current.moved = true;
      dragRef.current.lastScreenX = e.screenX;
      dragRef.current.lastScreenY = e.screenY;
      window.desktopIsland?.moveBy(dx, dy);
    }
  };

  const handlePointerUp = () => {
    const wasMoved = dragRef.current.moved;
    dragRef.current.dragging = false;
    if (!wasMoved && !expanded) {
      setExpanded(true);
    }
  };

  const dragHandleProps: React.HTMLAttributes<HTMLDivElement> = {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onDoubleClick: () => window.desktopIsland?.snapCenter(),
  };

  return (
    <div className="w-screen h-screen bg-transparent flex flex-col items-center pt-1.5 px-2 select-none overflow-hidden">
      {!expanded ? (
        /* Frameless Always-On-Top Dynamic Island Pill */
        <div
          {...dragHandleProps}
          role="button"
          tabIndex={0}
          aria-label="Expand Spotify Mini Desktop Dynamic Island"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setExpanded(true);
            }
          }}
          className="mac-dynamic-island-pill flex items-center gap-2.5 h-[42px] pl-2 pr-2 rounded-full cursor-pointer w-full max-w-[376px] transition-transform duration-150 hover:scale-[1.01] active:scale-[0.985]"
        >
          {hasActiveTrack ? (
            <AlbumArt
              track={track}
              size="xs"
              isPlaying={playback.isPlaying}
              className="!w-7 !h-7 !rounded-full shrink-0"
            />
          ) : (
            <BrandMark size={24} className="!rounded-full shrink-0" />
          )}

          <div className="min-w-0 flex-1 pr-1">
            <div className="flex items-center gap-1.5">
              <span className="font-display text-[12.5px] font-semibold tracking-[-0.01em] text-[var(--text-primary)] truncate">
                {!hasActiveTrack
                  ? companion.extensionConnected
                    ? 'Spotify Web idle — start a song'
                    : 'Waiting for Spotify in Chrome…'
                  : playback.isPlaying && activeLyricText
                    ? activeLyricText
                    : track.title}
              </span>
              {playback.isPlaying && (
                <span
                  className="inline-flex items-end gap-[2px] h-2.5 shrink-0"
                  aria-hidden="true"
                >
                  <span
                    className="island-eq-bar w-[2px] h-2.5 rounded-full bg-[var(--accent-primary)]"
                    style={{ animationDelay: '0ms' }}
                  />
                  <span
                    className="island-eq-bar w-[2px] h-2 rounded-full bg-[var(--accent-primary)]"
                    style={{ animationDelay: '220ms' }}
                  />
                  <span
                    className="island-eq-bar w-[2px] h-2.5 rounded-full bg-[var(--accent-primary)]"
                    style={{ animationDelay: '440ms' }}
                  />
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            {hasActiveTrack && (
              <button
                type="button"
                aria-label={playback.isPlaying ? 'Pause' : 'Play'}
                onClick={(e) => {
                  e.stopPropagation();
                  actions.togglePlay();
                }}
                className="w-6 h-6 rounded-full inline-flex items-center justify-center bg-[var(--accent-primary)] text-[var(--accent-contrast)] hover:bg-[var(--accent-hover)] transition-colors cursor-pointer"
              >
                {playback.isPlaying ? (
                  <Pause size={11} className="fill-current" />
                ) : (
                  <Play size={11} className="fill-current translate-x-[0.5px]" />
                )}
              </button>
            )}

            <button
              type="button"
              aria-label="Expand Dynamic Island"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(true);
              }}
              className="w-6 h-6 rounded-full inline-flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-interactive)] transition-colors cursor-pointer"
            >
              <ChevronDown size={13} />
            </button>
          </div>
        </div>
      ) : (
        /* Expanded Frameless macOS Frosted Glass Window */
        <div className="w-full flex-1 min-h-0 flex flex-col items-center">
          {/* Top Frosted Control Strip */}
          <div
            {...dragHandleProps}
            className="mac-glass-dock shrink-0 mb-1.5 inline-flex items-center gap-1 p-1 rounded-full cursor-grab active:cursor-grabbing"
          >
            {hasActiveTrack &&
              (
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
                  onClick={() => setMode(id)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-[background-color,color,box-shadow] cursor-pointer whitespace-nowrap ${
                    mode === id
                      ? 'bg-[var(--surface-active)] text-[var(--text-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {label}
                </button>
              ))}

            {hasActiveTrack && (
              <span
                className="h-3.5 w-[1px] bg-[var(--border-hairline)] mx-0.5"
                aria-hidden="true"
              />
            )}

            <button
              type="button"
              title="Snap to top-center"
              aria-label="Snap to top-center"
              onClick={() => window.desktopIsland?.snapCenter()}
              className="w-6 h-6 rounded-full inline-flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-interactive)] transition-colors cursor-pointer"
            >
              <LocateFixed size={12} />
            </button>

            <button
              type="button"
              title="Collapse to pill"
              aria-label="Collapse to pill"
              onClick={() => setExpanded(false)}
              className="w-6 h-6 rounded-full inline-flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-interactive)] transition-colors cursor-pointer"
            >
              <ChevronUp size={13} />
            </button>

            <button
              type="button"
              title="Hide to system tray"
              aria-label="Hide to system tray"
              onClick={() => window.desktopIsland?.hide()}
              className="w-6 h-6 rounded-full inline-flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-interactive)] transition-colors cursor-pointer"
            >
              <X size={12} />
            </button>

            <button
              type="button"
              title="Quit Desktop Dynamic Island"
              aria-label="Quit Desktop Dynamic Island"
              onClick={() => window.desktopIsland?.quit()}
              className="w-6 h-6 rounded-full inline-flex items-center justify-center text-rose-400 hover:bg-[var(--surface-interactive)] transition-colors cursor-pointer"
            >
              <Power size={11} />
            </button>
          </div>

          {!hasActiveTrack ? (
            <div className="mini-window-floating w-full max-w-[368px] rounded-[var(--radius-window)] p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1.5">
                <BrandMark size={18} />
                <span className="font-display text-[14px] font-semibold text-[var(--text-primary)]">
                  {companion.extensionConnected
                    ? 'No Track Playing'
                    : 'Chrome Extension Offline'}
                </span>
              </div>
              <p className="text-[12px] text-[var(--text-secondary)] leading-snug">
                {companion.extensionConnected
                  ? 'Start playing any song in Spotify Web inside Chrome.'
                  : 'Open Chrome with Spotify Mini loaded and open.spotify.com running.'}
              </p>
              <div className="mt-3 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    window.desktopIsland?.sendToExtension({ type: 'OPEN_SPOTIFY_TAB' })
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[12px] font-medium bg-[var(--accent-primary)] text-[var(--accent-contrast)] hover:bg-[var(--accent-hover)] transition-colors cursor-pointer"
                >
                  <ExternalLink size={12} />
                  Open Spotify Web
                </button>
              </div>
            </div>
          ) : (
            <>
              {mode === 'mini-horizontal' && (
                <FloatingMiniPlayer
                  track={track}
                  playback={playback}
                  actions={actions}
                  settings={settings}
                  layout="horizontal"
                  onToggleLayout={() => setMode('mini-vertical')}
                  onToggleLyrics={() => setMode('lyrics')}
                  onClose={() => setExpanded(false)}
                  dragHandleProps={dragHandleProps}
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
                  onToggleLayout={() => setMode('mini-horizontal')}
                  onToggleLyrics={() => setMode('lyrics')}
                  onClose={() => setExpanded(false)}
                  dragHandleProps={dragHandleProps}
                  elevated
                />
              )}

              {mode === 'lyrics' && (
                <FloatingLyricsView
                  track={track}
                  playback={playback}
                  actions={actions}
                  settings={settings}
                  lyricsStatus={snapshot?.lyricsStatus ?? 'empty'}
                  onSwitchToMiniPlayer={() => setMode('mini-horizontal')}
                  onClose={() => setExpanded(false)}
                  dragHandleProps={dragHandleProps}
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
                  lyricsStatus={snapshot?.lyricsStatus ?? 'empty'}
                  sizePreset="medium"
                  onSwitchToMiniPlayer={() => setMode('mini-horizontal')}
                  onClose={() => setExpanded(false)}
                  dragHandleProps={dragHandleProps}
                  elevated
                  fillViewport
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
