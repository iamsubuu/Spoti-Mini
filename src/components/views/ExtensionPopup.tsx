import React, { useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  Heart,
  Loader2,
  MicVocal,
  PictureInPicture2,
  RefreshCw,
  Settings,
  WifiOff,
} from 'lucide-react';
import type {
  LyricsLoadStatus,
  PlaybackActions,
  PlaybackState,
  PlayerSettings,
  Track,
} from '../../types/player';
import { getActiveLyricIndex } from '../../services/mockPlayerAdapter';
import { AlbumArt } from '../ui/AlbumArt';
import { BrandMark } from '../ui/BrandMark';
import { GlassArtworkBackdrop } from '../ui/GlassArtworkBackdrop';
import { IconButton } from '../ui/IconButton';
import { PlaybackControls } from '../ui/PlaybackControls';
import { ProgressBar } from '../ui/ProgressBar';
import { VolumeControl } from '../ui/VolumeControl';

interface ExtensionPopupProps {
  track: Track;
  tracks: Track[];
  playback: PlaybackState;
  actions: PlaybackActions;
  settings: PlayerSettings;
  lyricsStatus?: LyricsLoadStatus;
  isFloatingOpen: boolean;
  onOpenFloating: () => void;
  onOpenLyrics: () => void;
  onOpenSettings: () => void;
  onReconnect?: () => void;
  onOpenSpotify?: () => void;
  footerNote?: string;
  pipNotice?: string | null;
  onDismissPipNotice?: () => void;
  onToggleDynamicIsland?: () => void;
}

export const ExtensionPopup: React.FC<ExtensionPopupProps> = ({
  track,
  tracks,
  playback,
  actions,
  settings,
  lyricsStatus = 'ready',
  isFloatingOpen,
  onOpenFloating,
  onOpenLyrics,
  onOpenSettings,
  onReconnect,
  onOpenSpotify,
  footerNote,
  pipNotice,
  onDismissPipNotice,
  onToggleDynamicIsland,
}) => {
  const [showInlineLyrics, setShowInlineLyrics] = useState(true);

  const isDisconnected = playback.connectionStatus === 'disconnected';
  const isReconnecting = playback.connectionStatus === 'reconnecting';
  const hasActiveTrack = playback.hasActiveTrack !== false;
  const controlsDisabled = isDisconnected || isReconnecting || !hasActiveTrack;
  const compact = settings.compactMode;

  const activeLyricIdx = getActiveLyricIndex(
    track.lyrics,
    playback.currentTimeSec,
    playback.activeLyricIndexOverride
  );
  const currentLyric =
    activeLyricIdx >= 0
      ? track.lyrics[activeLyricIdx]?.text
      : track.lyrics[0]?.text ?? null;
  const nextLyric =
    activeLyricIdx >= 0 && activeLyricIdx + 1 < track.lyrics.length
      ? track.lyrics[activeLyricIdx + 1]?.text
      : activeLyricIdx < 0 && track.lyrics.length > 1
        ? track.lyrics[1]?.text
        : null;

  return (
    <section
      aria-label="Spotify Mini Chrome Extension Popup"
      className="mini-window relative w-full max-w-[368px] rounded-[var(--radius-window)] overflow-hidden transition-[padding] duration-200"
    >
      {/* Frosted macOS ambient artwork vibrancy */}
      <GlassArtworkBackdrop
        artwork={track.artwork}
        isLight={settings.theme === 'light'}
      />

      {/* Popup Top Bar */}
      <div
        className={`relative flex items-center justify-between border-b border-[var(--border-hairline)] ${
          compact ? 'px-4 py-2.5' : 'px-5 py-3.5'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <BrandMark size={18} />
          <span className="font-display text-[13.5px] font-semibold tracking-[-0.01em] text-[var(--text-primary)] whitespace-nowrap">
            Spotify Mini
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Functional Spotify Connection Indicator (icon + explicit text, zero pill clutter) */}
          <div
            className="flex items-center gap-1.5 text-[11.5px] font-medium whitespace-nowrap"
            role="status"
            aria-live="polite"
          >
            {playback.connectionStatus === 'connected' && (
              <>
                <CheckCircle2 size={13} className="text-[var(--accent-primary)] shrink-0" />
                <span className="text-[var(--text-secondary)]">Spotify Web</span>
              </>
            )}
            {playback.connectionStatus === 'reconnecting' && (
              <>
                <Loader2 size={13} className="text-amber-400 animate-spin shrink-0" />
                <span className="text-amber-400">Connecting</span>
              </>
            )}
            {playback.connectionStatus === 'disconnected' && (
              <>
                <WifiOff size={13} className="text-rose-400 shrink-0" />
                <span className="text-rose-400">Disconnected</span>
              </>
            )}
          </div>

          <span className="h-3.5 w-[1px] bg-[var(--border-hairline)]" aria-hidden="true" />

          {onToggleDynamicIsland && (
            <IconButton
              label={
                settings.dynamicIslandEnabled
                  ? 'Hide frameless Dynamic Island'
                  : 'Show frameless Dynamic Island'
              }
              active={settings.dynamicIslandEnabled}
              size="sm"
              onClick={onToggleDynamicIsland}
            >
              <PictureInPicture2 size={15} />
            </IconButton>
          )}

          <IconButton label="Open settings" size="sm" onClick={onOpenSettings}>
            <Settings size={15} />
          </IconButton>
        </div>
      </div>

      {/* Disconnected State Notice */}
      {isDisconnected && (
        <div className="relative px-5 py-3 bg-rose-500/10 border-b border-[var(--border-hairline)] flex items-center justify-between gap-2">
          <p className="text-[12px] text-[var(--text-primary)] leading-snug">
            {playback.errorMessage || 'No active Spotify Web tab detected.'}
          </p>
          <div className="flex items-center gap-1.5 shrink-0">
            {onOpenSpotify && (
              <button
                type="button"
                onClick={onOpenSpotify}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[8px] text-[11.5px] font-medium bg-[var(--accent-primary)] text-[var(--accent-contrast)] hover:bg-[var(--accent-hover)] transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Open Spotify
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (onReconnect) {
                  onReconnect();
                } else {
                  actions.setConnectionStatus('reconnecting');
                  window.setTimeout(() => actions.setConnectionStatus('connected'), 700);
                }
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] text-[11.5px] font-medium bg-[var(--surface-elevated)] text-[var(--text-primary)] border border-[var(--border-strong)] hover:bg-[var(--surface-active)] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <RefreshCw size={11} />
              Reconnect
            </button>
          </div>
        </div>
      )}

      {/* Optional PiP / Runtime Notice */}
      {pipNotice && (
        <div className="relative px-5 py-2.5 bg-[var(--accent-muted)] border-b border-[var(--border-hairline)] flex items-center justify-between gap-2">
          <p className="text-[11.5px] text-[var(--text-primary)] leading-snug">
            {pipNotice}
          </p>
          {onDismissPipNotice && (
            <button
              type="button"
              onClick={onDismissPipNotice}
              className="text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer shrink-0"
            >
              Dismiss
            </button>
          )}
        </div>
      )}

      {/* Main Now Playing Body */}
      <div className={`relative ${compact ? 'p-4 space-y-3.5' : 'p-5 space-y-4'}`}>
        <div className="flex items-center gap-3.5">
          <AlbumArt
            track={track}
            size={compact ? 'sm' : 'md'}
            isPlaying={playback.isPlaying && !controlsDisabled}
          />

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="font-display text-[15.5px] font-semibold tracking-[-0.015em] text-[var(--text-primary)] truncate">
                  {track.title}
                </h2>
                <p className="text-[13px] text-[var(--text-secondary)] truncate mt-0.5">
                  {track.artist}
                </p>
              </div>
              <IconButton
                label={playback.isLiked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
                active={playback.isLiked}
                size="sm"
                disabled={controlsDisabled}
                onClick={actions.toggleLike}
              >
                <Heart
                  size={15}
                  className={playback.isLiked ? 'fill-current' : ''}
                />
              </IconButton>
            </div>

            <div className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-[var(--text-muted)] truncate">
              <span
                className={
                  playback.isPlaying && !controlsDisabled
                    ? 'text-[var(--accent-primary)] font-medium'
                    : ''
                }
              >
                {controlsDisabled
                  ? 'Standby'
                  : playback.isPlaying
                    ? 'Playing'
                    : 'Paused'}
              </span>
              <span aria-hidden="true">·</span>
              <span className="truncate">{track.album}</span>
            </div>
          </div>
        </div>

        {/* Progress Scrubber */}
        <ProgressBar
          currentTimeSec={playback.currentTimeSec}
          durationSec={track.durationSec}
          onSeek={actions.seekTo}
          disabled={controlsDisabled}
          compact={compact}
        />

        {/* Transport & Volume Row */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <VolumeControl
            volume={playback.volume}
            isMuted={playback.isMuted}
            onVolumeChange={actions.setVolume}
            onToggleMute={actions.toggleMute}
            disabled={controlsDisabled}
          />

          <PlaybackControls
            isPlaying={playback.isPlaying}
            onTogglePlay={actions.togglePlay}
            onPrev={actions.prevTrack}
            onNext={actions.nextTrack}
            size={compact ? 'compact' : 'default'}
            disabled={controlsDisabled}
          />

          <IconButton
            label={showInlineLyrics ? 'Hide inline lyric preview' : 'Show inline lyric preview'}
            active={showInlineLyrics}
            variant="surface"
            size="sm"
            onClick={() => setShowInlineLyrics((prev) => !prev)}
          >
            <MicVocal size={15} />
          </IconButton>
        </div>

        {/* Inline Synchronized Lyric Strip (toggled by Lyrics button) */}
        {showInlineLyrics && (
          <div className="rounded-[12px] bg-[var(--surface-interactive)] border border-[var(--border-hairline)] px-3.5 py-2.5 transition-all duration-200">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[11px] font-medium text-[var(--text-muted)]">
                Live Lyrics
              </span>
              <button
                type="button"
                onClick={onOpenLyrics}
                className="text-[11px] font-medium text-[var(--accent-primary)] hover:underline cursor-pointer whitespace-nowrap"
              >
                Expand Lyrics
              </button>
            </div>
            {lyricsStatus === 'loading' ? (
              <p className="text-[12.5px] text-[var(--text-muted)]">
                Fetching synchronized lyrics…
              </p>
            ) : currentLyric ? (
              <div className="space-y-0.5">
                <p className="font-display text-[13px] font-medium text-[var(--text-primary)] leading-snug line-clamp-1">
                  {currentLyric}
                </p>
                {nextLyric && (
                  <p className="text-[12px] text-[var(--text-muted)] leading-snug line-clamp-1">
                    {nextLyric}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-[12.5px] text-[var(--text-muted)]">
                {track.isInstrumental
                  ? 'Instrumental — no vocal lyrics for this track.'
                  : 'No synchronized lyrics available for this track.'}
              </p>
            )}
          </div>
        )}

        {/* Primary Action Footer */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={onOpenFloating}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[11px] text-[13px] font-medium bg-[var(--text-primary)] text-[var(--bg-stage)] hover:opacity-92 active:scale-[0.985] transition-[opacity,transform] duration-150 cursor-pointer whitespace-nowrap"
          >
            <ExternalLink size={14} />
            {isFloatingOpen ? 'Focus Floating Player' : 'Open Floating Player'}
          </button>

          <button
            type="button"
            onClick={onOpenLyrics}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-[11px] text-[13px] font-medium bg-[var(--surface-interactive)] text-[var(--text-primary)] border border-[var(--border-hairline)] hover:bg-[var(--surface-interactive-hover)] active:scale-[0.985] transition-[background-color,transform] duration-150 cursor-pointer whitespace-nowrap shrink-0"
          >
            <MicVocal size={14} className="text-[var(--accent-primary)]" />
            Lyrics
          </button>
        </div>
      </div>

      {/* Subtle Quick Queue Switcher */}
      <div className="border-t border-[var(--border-hairline)] px-4 py-2.5 bg-[var(--surface-interactive)]/50">
        <div className="flex items-center justify-between gap-2 text-[11.5px] text-[var(--text-muted)]">
          <span className="truncate">
            {footerNote ? (
              footerNote
            ) : (
              <>
                Up next:{' '}
                <strong className="font-medium text-[var(--text-secondary)]">
                  {tracks[(playback.currentTrackIndex + 1) % tracks.length]?.title ?? 'Next track'}
                </strong>
              </>
            )}
          </span>
          <button
            type="button"
            onClick={actions.nextTrack}
            disabled={controlsDisabled}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium cursor-pointer disabled:opacity-40 whitespace-nowrap shrink-0"
          >
            Skip
          </button>
        </div>
      </div>
    </section>
  );
};
