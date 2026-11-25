import React, { useEffect, useState } from 'react';
import { ExtensionPopup } from '../components/views/ExtensionPopup';
import { FloatingLyricsView } from '../components/views/FloatingLyricsView';
import { SettingsView } from '../components/views/SettingsView';
import { useExtensionPlayer } from '../hooks/useExtensionPlayer';

type PopupRoute = 'popup' | 'lyrics' | 'settings';

export const PopupApp: React.FC = () => {
  const [route, setRoute] = useState<PopupRoute>('popup');
  const {
    settings,
    updateSettings,
    resetSettings,
    snapshot,
    currentTrack,
    playback,
    lyricsStatus,
    actions,
    footerNote,
    pipNotice,
    dismissPipNotice,
    reconnect,
    openSpotifyTab,
    openFloating,
  } = useExtensionPlayer();

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

  // Keyboard shortcuts inside extension popup
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
        setRoute((prev) => (prev === 'lyrics' ? 'popup' : 'lyrics'));
      } else if (e.key === 'ArrowRight' && e.shiftKey) {
        e.preventDefault();
        actions.seekTo(playback.currentTimeSec + 10);
      } else if (e.key === 'ArrowLeft' && e.shiftKey) {
        e.preventDefault();
        actions.seekTo(Math.max(0, playback.currentTimeSec - 10));
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [actions, playback.currentTimeSec]);

  const widthStyle: React.CSSProperties =
    route === 'settings'
      ? { width: 540, maxHeight: 600 }
      : route === 'lyrics'
        ? { width: settings.compactMode ? 376 : 420 }
        : { width: 368 };

  return (
    <div
      style={widthStyle}
      className="bg-[var(--bg-stage)] text-[var(--text-primary)] overflow-y-auto"
    >
      {route === 'popup' && (
        <ExtensionPopup
          track={currentTrack}
          tracks={[currentTrack]}
          playback={playback}
          actions={actions}
          settings={settings}
          lyricsStatus={lyricsStatus}
          isFloatingOpen={snapshot.isFloatingOpen}
          onOpenFloating={() => void openFloating()}
          onOpenLyrics={() => setRoute('lyrics')}
          onOpenSettings={() => setRoute('settings')}
          onReconnect={reconnect}
          onOpenSpotify={openSpotifyTab}
          footerNote={footerNote}
          pipNotice={pipNotice}
          onDismissPipNotice={dismissPipNotice}
          onToggleDynamicIsland={() =>
            updateSettings({
              dynamicIslandEnabled: !settings.dynamicIslandEnabled,
            })
          }
        />
      )}

      {route === 'lyrics' && (
        <FloatingLyricsView
          track={currentTrack}
          playback={playback}
          actions={actions}
          settings={settings}
          lyricsStatus={lyricsStatus}
          onSwitchToMiniPlayer={() => setRoute('popup')}
          onClose={() => setRoute('popup')}
        />
      )}

      {route === 'settings' && (
        <SettingsView
          settings={settings}
          onUpdateSettings={updateSettings}
          onResetSettings={resetSettings}
          onBack={() => setRoute('popup')}
        />
      )}
    </div>
  );
};
