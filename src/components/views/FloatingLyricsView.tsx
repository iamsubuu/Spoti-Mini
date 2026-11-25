import React from 'react';
import {
  GripHorizontal,
  Minimize2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  X,
} from 'lucide-react';
import type {
  LyricsLoadStatus,
  PlaybackActions,
  PlaybackState,
  PlayerSettings,
  Track,
} from '../../types/player';
import { AlbumArt } from '../ui/AlbumArt';
import { GlassArtworkBackdrop } from '../ui/GlassArtworkBackdrop';
import { IconButton } from '../ui/IconButton';
import { ProgressBar } from '../ui/ProgressBar';
import { SynchronizedLyrics } from '../ui/SynchronizedLyrics';

interface FloatingLyricsViewProps {
  track: Track;
  playback: PlaybackState;
  actions: PlaybackActions;
  settings: PlayerSettings;
  lyricsStatus: LyricsLoadStatus;
  onSwitchToMiniPlayer: () => void;
  onClose: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  elevated?: boolean;
  fillViewport?: boolean;
}

export const FloatingLyricsView: React.FC<FloatingLyricsViewProps> = ({
  track,
  playback,
  actions,
  settings,
  lyricsStatus,
  onSwitchToMiniPlayer,
  onClose,
  dragHandleProps,
  elevated = false,
  fillViewport = false,
}) => {
  const compact = settings.compactMode;
  const controlsDisabled = playback.connectionStatus !== 'connected';
  const windowClass = elevated ? 'mini-window-floating' : 'mini-window';

  return (
    <section
      aria-label="Floating Synchronized Lyrics"
      className={`${windowClass} relative w-full rounded-[var(--radius-window)] overflow-hidden flex flex-col ${
        fillViewport
          ? compact
            ? 'max-w-[376px] flex-1 min-h-0 max-h-[480px]'
            : 'max-w-[420px] flex-1 min-h-0 max-h-[540px]'
          : compact
            ? 'max-w-[376px] h-[440px]'
            : 'max-w-[420px] h-[510px]'
      }`}
    >
      {/* macOS frosted artwork vibrancy */}
      <GlassArtworkBackdrop
        artwork={track.artwork}
        isLight={settings.theme === 'light'}
      />

      {/* Compact Top Bar */}
      <header
        {...dragHandleProps}
        className={`relative flex items-center justify-between gap-3 border-b border-[var(--border-hairline)] shrink-0 ${
          compact ? 'px-4 py-2.5' : 'px-5 py-3.5'
        } ${dragHandleProps ? 'cursor-grab active:cursor-grabbing' : ''}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <AlbumArt
            track={track}
            size="xs"
            isPlaying={playback.isPlaying && !controlsDisabled}
          />
          <div className="min-w-0">
            <h2 className="font-display text-[13.5px] font-semibold text-[var(--text-primary)] truncate leading-tight">
              {track.title}
            </h2>
            <p className="text-[12px] text-[var(--text-secondary)] truncate leading-tight mt-0.5">
              {track.artist}
            </p>
          </div>
        </div>

        <div
          className="flex items-center gap-1 shrink-0"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {dragHandleProps && (
            <GripHorizontal
              size={14}
              className="text-[var(--text-muted)] mr-1 hidden sm:block"
              aria-hidden="true"
            />
          )}
          <button
            type="button"
            onClick={onSwitchToMiniPlayer}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[9px] text-[12px] font-medium bg-[var(--surface-interactive)] text-[var(--text-secondary)] hover:bg-[var(--surface-interactive-hover)] hover:text-[var(--text-primary)] transition-colors duration-150 cursor-pointer whitespace-nowrap"
          >
            <Minimize2 size={13} />
            Mini Player
          </button>
          <IconButton label="Close lyrics window" size="sm" onClick={onClose}>
            <X size={15} />
          </IconButton>
        </div>
      </header>

      {/* Scrollable Synchronized Lyrics Body */}
      <SynchronizedLyrics
        track={track}
        currentTimeSec={playback.currentTimeSec}
        fontSize={settings.lyricsFontSize}
        status={lyricsStatus}
        compact={compact}
        activeIndexOverride={playback.activeLyricIndexOverride}
        onSeekToLine={actions.seekTo}
        onClickLine={actions.seekToLyricLine}
        onSwitchToPlayer={onSwitchToMiniPlayer}
        onRetryLyrics={
          actions.retryLyrics ?? (() => actions.setLyricsStatusOverride('auto'))
        }
      />

      {/* Quiet Bottom Transport Bar */}
      <footer
        className={`relative border-t border-[var(--border-hairline)] bg-[var(--surface-elevated)]/60 shrink-0 ${
          compact ? 'px-4 py-2.5' : 'px-5 py-3'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-0.5 shrink-0">
            <IconButton
              label="Previous track"
              size="sm"
              disabled={controlsDisabled}
              onClick={actions.prevTrack}
            >
              <SkipBack size={14} className="fill-current" />
            </IconButton>
            <IconButton
              label={playback.isPlaying ? 'Pause' : 'Play'}
              variant="accent"
              size="sm"
              disabled={controlsDisabled}
              onClick={actions.togglePlay}
              className="rounded-full"
            >
              {playback.isPlaying ? (
                <Pause size={14} className="fill-current" />
              ) : (
                <Play size={14} className="fill-current translate-x-[0.5px]" />
              )}
            </IconButton>
            <IconButton
              label="Next track"
              size="sm"
              disabled={controlsDisabled}
              onClick={actions.nextTrack}
            >
              <SkipForward size={14} className="fill-current" />
            </IconButton>
          </div>

          <ProgressBar
            currentTimeSec={playback.currentTimeSec}
            durationSec={track.durationSec}
            onSeek={actions.seekTo}
            timestampPlacement="inline"
            disabled={controlsDisabled}
            compact
            className="flex-1 min-w-0"
          />
        </div>
      </footer>
    </section>
  );
};
