import React, { useEffect, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Pause,
  Pin,
  PinOff,
  Play,
  X,
} from 'lucide-react';
import type {
  FloatingDisplayMode,
  LyricsLoadStatus,
  PlaybackActions,
  PlaybackState,
  PlayerSettings,
  Track,
} from '../types/player';
import { getActiveLyricIndex } from '../services/mockPlayerAdapter';
import { AlbumArt } from '../components/ui/AlbumArt';
import { CombinedPlayerLyricsView } from '../components/views/CombinedPlayerLyricsView';
import { FloatingLyricsView } from '../components/views/FloatingLyricsView';
import { FloatingMiniPlayer } from '../components/views/FloatingMiniPlayer';

export interface DynamicIslandState {
  visible: boolean;
  track: Track;
  playback: PlaybackState;
  actions: PlaybackActions;
  settings: PlayerSettings;
  lyricsStatus: LyricsLoadStatus;
  onPopOutPip?: (mode: FloatingDisplayMode) => void;
  onHideIsland: () => void;
}

const DynamicIslandApp: React.FC<{
  state: DynamicIslandState;
}> = ({ state }) => {
  const {
    visible,
    track,
    playback,
    actions,
    settings,
    lyricsStatus,
    onPopOutPip,
    onHideIsland,
  } = state;

  const [expanded, setExpanded] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [mode, setMode] = useState<FloatingDisplayMode>(
    settings.defaultDisplayMode
  );
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    dragging: boolean;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    moved: boolean;
  }>({ dragging: false, startX: 0, startY: 0, origX: 0, origY: 0, moved: false });

  useEffect(() => {
    setMode(settings.defaultDisplayMode);
  }, [settings.defaultDisplayMode]);

  // Collapse when clicking outside on the page (unless pinned)
  useEffect(() => {
    if (!expanded || pinned) return;
    const onDocPointerDown = (e: PointerEvent) => {
      const host = document.getElementById('spotify-mini-dynamic-island-host');
      if (host && e.composedPath().includes(host)) {
        return;
      }
      setExpanded(false);
    };
    window.addEventListener('pointerdown', onDocPointerDown, true);
    return () => window.removeEventListener('pointerdown', onDocPointerDown, true);
  }, [expanded, pinned]);

  if (!visible) return null;

  const activeLyricIdx = getActiveLyricIndex(
    track.lyrics,
    playback.currentTimeSec,
    playback.activeLyricIndexOverride
  );
  const activeLyricText =
    activeLyricIdx >= 0 ? track.lyrics[activeLyricIdx]?.text : null;

  const isLight = settings.theme === 'light';
  const themeAttr = settings.theme === 'obsidian' ? undefined : settings.theme;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, input, [role="slider"]')) {
      return;
    }
    dragRef.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      origX: dragOffset.x,
      origY: dragOffset.y,
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.dragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      dragRef.current.moved = true;
    }
    setDragOffset({
      x: dragRef.current.origX + dx,
      y: Math.max(0, dragRef.current.origY + dy),
    });
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
    onDoubleClick: () => setDragOffset({ x: 0, y: 0 }),
  };

  return (
    <div
      data-theme={themeAttr}
      className={`${isLight ? '' : 'dark'} pointer-events-none select-none font-sans text-[var(--text-primary)]`}
    >
      <div
        ref={containerRef}
        style={{
          transform: `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0)`,
        }}
        className="pointer-events-auto flex flex-col items-center transition-transform duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]"
      >
        {!expanded ? (
          /* Collapsed macOS Dynamic Island Pill */
          <div
            {...dragHandleProps}
            role="button"
            tabIndex={0}
            aria-label="Expand Spotify Mini Dynamic Island"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setExpanded(true);
              }
            }}
            className="mac-dynamic-island-pill group flex items-center gap-2.5 h-[40px] pl-2 pr-2 rounded-full cursor-pointer max-w-[380px] transition-[transform,box-shadow,width] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.02] active:scale-[0.985]"
          >
            <AlbumArt
              track={track}
              size="xs"
              isPlaying={playback.isPlaying}
              className="!w-6 !h-6 !rounded-full shrink-0"
            />

            <div className="min-w-0 flex-1 pr-1">
              <div className="flex items-center gap-1.5">
                <span className="font-display text-[12.5px] font-semibold tracking-[-0.01em] text-[var(--text-primary)] truncate max-w-[190px]">
                  {playback.isPlaying && activeLyricText
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
          /* Expanded Frameless Dynamic Island Glass Surface */
          <div className="flex flex-col items-center max-w-[calc(100vw-1.5rem)]">
            {/* Top Frosted Island Toolbar */}
            <div
              {...dragHandleProps}
              className="mac-glass-dock mb-1.5 inline-flex items-center gap-1 p-1 rounded-full cursor-grab active:cursor-grabbing"
            >
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

              <span
                className="h-3.5 w-[1px] bg-[var(--border-hairline)] mx-0.5"
                aria-hidden="true"
              />

              <button
                type="button"
                title={pinned ? 'Unpin open' : 'Pin open'}
                aria-label={pinned ? 'Unpin open' : 'Pin open'}
                onClick={() => setPinned((p) => !p)}
                className={`w-6 h-6 rounded-full inline-flex items-center justify-center transition-colors cursor-pointer ${
                  pinned
                    ? 'bg-[var(--accent-muted)] text-[var(--accent-primary)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-interactive)]'
                }`}
              >
                {pinned ? <Pin size={12} /> : <PinOff size={12} />}
              </button>

              {onPopOutPip && (
                <button
                  type="button"
                  title="Pop out cross-app Document PiP"
                  aria-label="Pop out cross-app Document PiP"
                  onClick={() => onPopOutPip(mode)}
                  className="w-6 h-6 rounded-full inline-flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-interactive)] transition-colors cursor-pointer"
                >
                  <ExternalLink size={12} />
                </button>
              )}

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
                title="Hide Dynamic Island"
                aria-label="Hide Dynamic Island"
                onClick={() => {
                  setExpanded(false);
                  onHideIsland();
                }}
                className="w-6 h-6 rounded-full inline-flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-interactive)] transition-colors cursor-pointer"
              >
                <X size={12} />
              </button>
            </div>

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
                lyricsStatus={lyricsStatus}
                onSwitchToMiniPlayer={() => setMode('mini-horizontal')}
                onClose={() => setExpanded(false)}
                dragHandleProps={dragHandleProps}
                elevated
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
                onSwitchToMiniPlayer={() => setMode('mini-horizontal')}
                onClose={() => setExpanded(false)}
                dragHandleProps={dragHandleProps}
                elevated
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export class DynamicIslandController {
  private host: HTMLElement | null = null;
  private shadow: ShadowRoot | null = null;
  private root: Root | null = null;
  private cssLoaded = false;

  private ensureMounted(): void {
    if (this.root && this.host?.isConnected) return;

    const HOST_ID = 'spotify-mini-dynamic-island-host';
    let host = document.getElementById(HOST_ID);
    if (!host) {
      host = document.createElement('div');
      host.id = HOST_ID;
      host.style.cssText = [
        'all: initial',
        'position: fixed',
        'top: 10px',
        'left: 50%',
        'transform: translateX(-50%)',
        'z-index: 2147483647',
        'pointer-events: none',
        'font-size: 16px',
      ].join('; ');
      (document.body ?? document.documentElement).appendChild(host);
    }

    this.host = host;
    const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
    this.shadow = shadow;

    if (!this.cssLoaded) {
      this.cssLoaded = true;
      const cssUrl = chrome.runtime.getURL('pip.css');
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = cssUrl;
      shadow.appendChild(link);

      void fetch(cssUrl)
        .then((res) => (res.ok ? res.text() : ''))
        .then((css) => {
          if (css && 'CSSStyleSheet' in window && this.shadow) {
            const sheet = new CSSStyleSheet();
            sheet.replaceSync(css);
            this.shadow.adoptedStyleSheets = [
              ...this.shadow.adoptedStyleSheets,
              sheet,
            ];
          }
        })
        .catch(() => {
          // <link> stylesheet handles styling when fetch isn't needed.
        });
    }

    let mount = shadow.getElementById('spotify-mini-island-mount');
    if (!mount) {
      mount = document.createElement('div');
      mount.id = 'spotify-mini-island-mount';
      shadow.appendChild(mount);
    }

    this.root = createRoot(mount);
  }

  public update(state: DynamicIslandState): void {
    if (!state.visible) {
      if (this.root && this.host) {
        this.root.render(<DynamicIslandApp state={state} />);
      }
      return;
    }

    this.ensureMounted();
    this.root?.render(<DynamicIslandApp state={state} />);
  }

  public destroy(): void {
    if (this.root) {
      try {
        this.root.unmount();
      } catch {
        // Ignore unmount error.
      }
      this.root = null;
    }
    this.host?.remove();
    this.host = null;
    this.shadow = null;
    this.cssLoaded = false;
  }
}
