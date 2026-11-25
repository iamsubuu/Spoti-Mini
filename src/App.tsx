import React, { useCallback, useEffect, useState } from 'react';
import { ExternalLink, X } from 'lucide-react';
import type {
  CombinedSizePreset,
  ConnectionStatus,
  FloatingDisplayMode,
  PlayerSettings,
  WorkspaceView,
} from './types/player';
import { DEFAULT_SETTINGS } from './services/mockPlayerAdapter';
import { useSimulatedPlayback } from './hooks/useSimulatedPlayback';
import { BrandMark } from './components/ui/BrandMark';
import { SegmentedControl } from './components/ui/SegmentedControl';
import { ExtensionPopup } from './components/views/ExtensionPopup';
import { FloatingMiniPlayer } from './components/views/FloatingMiniPlayer';
import { FloatingLyricsView } from './components/views/FloatingLyricsView';
import { CombinedPlayerLyricsView } from './components/views/CombinedPlayerLyricsView';
import { SettingsView } from './components/views/SettingsView';
import { DraggableFloatingOverlay } from './components/floating/DraggableFloatingOverlay';

const NAV_ITEMS: { id: WorkspaceView; label: string }[] = [
  { id: 'popup', label: 'Extension Popup' },
  { id: 'floating-mini', label: 'Floating Player' },
  { id: 'floating-lyrics', label: 'Lyrics View' },
  { id: 'combined', label: 'Combined View' },
  { id: 'settings', label: 'Settings' },
];

type MiniLayoutShowcase = 'horizontal' | 'vertical' | 'both';

export default function App() {
  const [activeView, setActiveView] = useState<WorkspaceView>('popup');
  const [previousView, setPreviousView] = useState<WorkspaceView>('popup');
  const [settings, setSettings] = useState<PlayerSettings>(DEFAULT_SETTINGS);

  // Stage-specific interactive preview controls
  const [miniShowcaseLayout, setMiniShowcaseLayout] =
    useState<MiniLayoutShowcase>('both');
  const [combinedSize, setCombinedSize] = useState<CombinedSizePreset>('wide');
  const [dismissedNotice, setDismissedNotice] = useState<string | null>(null);

  // Real interactive floating overlay window state
  const [isFloatingOpen, setIsFloatingOpen] = useState(false);
  const [floatingMode, setFloatingMode] = useState<FloatingDisplayMode>(
    DEFAULT_SETTINGS.defaultDisplayMode
  );

  const openFloatingWindow = useCallback(
    (explicitMode?: FloatingDisplayMode) => {
      setFloatingMode(explicitMode ?? settings.defaultDisplayMode);
      setIsFloatingOpen(true);
    },
    [settings.defaultDisplayMode]
  );

  const { tracks, currentTrack, playback, lyricsStatus, actions } =
    useSimulatedPlayback({
      autoOpenFloating: settings.autoOpenFloating,
      onAutoOpenFloating: () => openFloatingWindow(),
    });

  // Sync theme attribute and Tailwind dark class on <html>
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

  // Global desktop keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInteractiveTarget =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);
      if (isInteractiveTarget) return;

      if (e.code === 'Space' && target?.tagName !== 'BUTTON') {
        e.preventDefault();
        actions.togglePlay();
      } else if (e.key === 'm' || e.key === 'M') {
        actions.toggleMute();
      } else if (e.key === 'l' || e.key === 'L') {
        setActiveView((prev) =>
          prev === 'floating-lyrics' ? 'floating-mini' : 'floating-lyrics'
        );
      } else if (e.key === 'ArrowRight' && e.shiftKey) {
        e.preventDefault();
        actions.seekTo(playback.currentTimeSec + 10);
      } else if (e.key === 'ArrowLeft' && e.shiftKey) {
        e.preventDefault();
        actions.seekTo(playback.currentTimeSec - 10);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [actions, playback.currentTimeSec]);

  const handleUpdateSettings = useCallback((patch: Partial<PlayerSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleResetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  const navigateTo = useCallback(
    (next: WorkspaceView) => {
      setDismissedNotice(null);
      setPreviousView(activeView);
      setActiveView(next);
    },
    [activeView]
  );

  const handleStageWindowClose = useCallback((label: string) => {
    setDismissedNotice(label);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-stage)] text-[var(--text-primary)] transition-colors duration-200">
      {/* Top Bar — Strict 3-Zone Contract */}
      <header className="sticky top-0 z-30 border-b border-[var(--border-hairline)] bg-[var(--bg-stage)]/85 backdrop-blur-xl">
        <div className="max-w-[1320px] mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => navigateTo('popup')}
            className="flex items-center gap-2.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <BrandMark size={22} />
            <span className="font-display text-[16px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
              Spotify Mini
            </span>
          </button>

          {/* Zone 2: 5 Clean Single-Line Navigation Links */}
          <nav
            aria-label="Interface views"
            className="hidden lg:flex items-center gap-7"
          >
            {NAV_ITEMS.map((item) => {
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigateTo(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative py-5 text-[13.5px] font-medium whitespace-nowrap shrink-0 transition-colors duration-150 cursor-pointer ${
                    isActive
                      ? 'text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span
                      className="absolute bottom-0 inset-x-0 h-[2px] bg-[var(--accent-primary)] rounded-full"
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={() =>
                isFloatingOpen ? setIsFloatingOpen(false) : openFloatingWindow()
              }
              className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] text-[13px] font-medium bg-[var(--accent-primary)] text-[var(--accent-contrast)] hover:bg-[var(--accent-hover)] active:scale-[0.97] transition-[background-color,transform] duration-150 cursor-pointer whitespace-nowrap shrink-0"
            >
              {isFloatingOpen ? (
                <>
                  <X size={14} />
                  Close Floating
                </>
              ) : (
                <>
                  <ExternalLink size={14} />
                  Launch Floating
                </>
              )}
            </button>
          </div>
        </div>

        {/* Mobile / Tablet Compact View Switcher Row */}
        <div className="lg:hidden border-t border-[var(--border-hairline)] overflow-x-auto">
          <div className="flex items-center gap-1 px-4 py-2 min-w-max">
            {NAV_ITEMS.map((item) => {
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigateTo(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`px-3 py-1.5 rounded-[8px] text-[12.5px] font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[var(--surface-elevated)] text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Workspace Stage */}
      <main className="relative flex-1 flex flex-col">
        {/* Subtle Ambient Background Field */}
        <div
          className="pointer-events-none fixed inset-0 -z-10 opacity-35 transition-colors duration-700"
          style={{
            background: `radial-gradient(circle at 50% 24%, ${currentTrack.artwork.accentHue}, transparent 58%)`,
          }}
          aria-hidden="true"
        />

        {/* Contextual Preview Toolbar */}
        <div className="border-b border-[var(--border-hairline)] bg-[var(--bg-stage-subtle)]/70">
          <div className="max-w-[1320px] mx-auto px-5 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
            {/* Sample Track Switcher */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-[12px] font-medium text-[var(--text-muted)] whitespace-nowrap">
                Sample Track
              </span>
              <div
                className="inline-flex items-center gap-1 p-1 rounded-[10px] bg-[var(--surface-interactive)] border border-[var(--border-hairline)] overflow-x-auto max-w-full"
                role="radiogroup"
                aria-label="Select sample track"
              >
                {tracks.map((trk, idx) => {
                  const selected = idx === playback.currentTrackIndex;
                  return (
                    <button
                      key={trk.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => actions.selectTrack(idx)}
                      className={`px-2.5 py-1 rounded-[7px] text-[12px] font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                        selected
                          ? 'bg-[var(--surface-elevated)] text-[var(--text-primary)] shadow-sm ring-1 ring-[var(--border-hairline)]'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {trk.isInstrumental ? 'Glass Meridian (Inst.)' : trk.title}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* View-Contextual Controls */}
            <div className="flex items-center gap-3 flex-wrap">
              {activeView === 'popup' && (
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-[var(--text-muted)] whitespace-nowrap">
                    Spotify Link
                  </span>
                  <SegmentedControl<ConnectionStatus>
                    ariaLabel="Simulate Spotify Web connection state"
                    size="sm"
                    value={playback.connectionStatus}
                    onChange={actions.setConnectionStatus}
                    options={[
                      { value: 'connected', label: 'Connected' },
                      { value: 'reconnecting', label: 'Connecting' },
                      { value: 'disconnected', label: 'Disconnected' },
                    ]}
                  />
                </div>
              )}

              {activeView === 'floating-mini' && (
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-[var(--text-muted)] whitespace-nowrap">
                    Layout
                  </span>
                  <SegmentedControl<MiniLayoutShowcase>
                    ariaLabel="Floating mini player layout preview"
                    size="sm"
                    value={miniShowcaseLayout}
                    onChange={(val) => {
                      setDismissedNotice(null);
                      setMiniShowcaseLayout(val);
                    }}
                    options={[
                      { value: 'both', label: 'Horizontal & Vertical' },
                      { value: 'horizontal', label: 'Horizontal' },
                      { value: 'vertical', label: 'Vertical' },
                    ]}
                  />
                </div>
              )}

              {(activeView === 'floating-lyrics' || activeView === 'combined') && (
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-[var(--text-muted)] whitespace-nowrap">
                    Lyrics State
                  </span>
                  <SegmentedControl<'auto' | 'loading' | 'empty'>
                    ariaLabel="Lyrics state preview"
                    size="sm"
                    value={playback.lyricsStatusOverride}
                    onChange={actions.setLyricsStatusOverride}
                    options={[
                      { value: 'auto', label: 'Synced' },
                      { value: 'loading', label: 'Loading' },
                      { value: 'empty', label: 'Empty' },
                    ]}
                  />
                </div>
              )}

              {activeView === 'combined' && (
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-[var(--text-muted)] whitespace-nowrap">
                    Window Width
                  </span>
                  <SegmentedControl<CombinedSizePreset>
                    ariaLabel="Combined window size preset"
                    size="sm"
                    value={combinedSize}
                    onChange={setCombinedSize}
                    options={[
                      { value: 'wide', label: 'Wide' },
                      { value: 'medium', label: 'Medium' },
                      { value: 'narrow', label: 'Stacked' },
                    ]}
                  />
                </div>
              )}

              {activeView === 'settings' && (
                <div className="text-[12px] text-[var(--text-muted)] flex items-center gap-2">
                  <span>Changes apply immediately to all views</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Centered Interactive Surface Showcase */}
        <div className="flex-1 max-w-[1320px] w-full mx-auto px-5 sm:px-8 py-10 sm:py-14 flex flex-col items-center justify-center">
          {/* Dismissed Window Recovery Prompt (when clicking Close inside stage preview) */}
          {dismissedNotice ? (
            <div className="mini-window rounded-[var(--radius-window)] px-8 py-7 text-center max-w-[380px]">
              <h2 className="font-display text-[15.5px] font-semibold text-[var(--text-primary)]">
                {dismissedNotice} Closed
              </h2>
              <p className="mt-1.5 text-[13px] text-[var(--text-secondary)]">
                In Chrome, playback continues uninterrupted in your Spotify Web tab.
              </p>
              <button
                type="button"
                onClick={() => setDismissedNotice(null)}
                className="mt-5 px-4 py-2 rounded-[10px] text-[13px] font-medium bg-[var(--accent-primary)] text-[var(--accent-contrast)] hover:bg-[var(--accent-hover)] transition-colors cursor-pointer whitespace-nowrap"
              >
                Reopen Window
              </button>
            </div>
          ) : (
            <>
              {/* 1. EXTENSION POPUP */}
              {activeView === 'popup' && (
                <div className="w-full flex flex-col items-center">
                  <ExtensionPopup
                    track={currentTrack}
                    tracks={tracks}
                    playback={playback}
                    actions={actions}
                    settings={settings}
                    lyricsStatus={lyricsStatus}
                    isFloatingOpen={isFloatingOpen}
                    onOpenFloating={() => openFloatingWindow()}
                    onOpenLyrics={() => navigateTo('floating-lyrics')}
                    onOpenSettings={() => navigateTo('settings')}
                  />
                </div>
              )}

              {/* 2. FLOATING MINI PLAYER (HORIZONTAL & VERTICAL) */}
              {activeView === 'floating-mini' && (
                <div className="w-full flex flex-col lg:flex-row items-center justify-center gap-10 lg:gap-14">
                  {(miniShowcaseLayout === 'both' ||
                    miniShowcaseLayout === 'horizontal') && (
                    <div className="flex flex-col items-center gap-3 w-full max-w-[464px]">
                      <span className="text-[12px] font-medium text-[var(--text-muted)]">
                        Horizontal Floating Bar
                      </span>
                      <FloatingMiniPlayer
                        track={currentTrack}
                        playback={playback}
                        actions={actions}
                        settings={settings}
                        layout="horizontal"
                        onToggleLayout={() => setMiniShowcaseLayout('vertical')}
                        onToggleLyrics={() => navigateTo('floating-lyrics')}
                        onClose={() =>
                          handleStageWindowClose('Horizontal Mini Player')
                        }
                      />
                    </div>
                  )}

                  {(miniShowcaseLayout === 'both' ||
                    miniShowcaseLayout === 'vertical') && (
                    <div className="flex flex-col items-center gap-3">
                      <span className="text-[12px] font-medium text-[var(--text-muted)]">
                        Vertical Floating Card
                      </span>
                      <FloatingMiniPlayer
                        track={currentTrack}
                        playback={playback}
                        actions={actions}
                        settings={settings}
                        layout="vertical"
                        onToggleLayout={() => setMiniShowcaseLayout('horizontal')}
                        onToggleLyrics={() => navigateTo('floating-lyrics')}
                        onClose={() =>
                          handleStageWindowClose('Vertical Mini Player')
                        }
                      />
                    </div>
                  )}
                </div>
              )}

              {/* 3. FLOATING LYRICS VIEW */}
              {activeView === 'floating-lyrics' && (
                <div className="w-full flex justify-center">
                  <FloatingLyricsView
                    track={currentTrack}
                    playback={playback}
                    actions={actions}
                    settings={settings}
                    lyricsStatus={lyricsStatus}
                    onSwitchToMiniPlayer={() => navigateTo('floating-mini')}
                    onClose={() => handleStageWindowClose('Floating Lyrics Window')}
                  />
                </div>
              )}

              {/* 4. COMBINED PLAYER + LYRICS VIEW */}
              {activeView === 'combined' && (
                <div className="w-full flex justify-center">
                  <CombinedPlayerLyricsView
                    track={currentTrack}
                    playback={playback}
                    actions={actions}
                    settings={settings}
                    lyricsStatus={lyricsStatus}
                    sizePreset={combinedSize}
                    onSwitchToMiniPlayer={() => navigateTo('floating-mini')}
                    onClose={() => handleStageWindowClose('Combined Player Window')}
                  />
                </div>
              )}

              {/* 5. SETTINGS INTERFACE */}
              {activeView === 'settings' && (
                <div className="w-full flex justify-center">
                  <SettingsView
                    settings={settings}
                    onUpdateSettings={handleUpdateSettings}
                    onResetSettings={handleResetSettings}
                    onBack={
                      previousView !== 'settings'
                        ? () => navigateTo(previousView)
                        : undefined
                    }
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Quiet Footer with Keyboard Hint Metadata (Zero Pills, Unboxed Text) */}
        <footer className="border-t border-[var(--border-hairline)]">
          <div className="max-w-[1320px] mx-auto px-5 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-4 text-[12px] text-[var(--text-muted)]">
            <div className="flex items-center gap-2 flex-wrap">
              <span>Space to play or pause</span>
              <span aria-hidden="true">·</span>
              <span>Shift + Arrow keys to seek</span>
              <span aria-hidden="true">·</span>
              <span>L for lyrics</span>
              <span aria-hidden="true">·</span>
              <span>M to mute</span>
            </div>
            <div className="flex items-center gap-2">
              <span>Simulated playback preview</span>
              <span aria-hidden="true">·</span>
              <span>Click any lyric line to seek</span>
            </div>
          </div>
        </footer>
      </main>

      {/* Live Draggable Floating Overlay Window */}
      {isFloatingOpen && (
        <DraggableFloatingOverlay
          mode={floatingMode}
          onChangeMode={setFloatingMode}
          onClose={() => setIsFloatingOpen(false)}
          track={currentTrack}
          playback={playback}
          actions={actions}
          settings={settings}
          lyricsStatus={lyricsStatus}
        />
      )}
    </div>
  );
}
