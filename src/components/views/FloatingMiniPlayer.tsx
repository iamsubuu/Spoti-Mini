import React from 'react';
import {
  Columns2,
  GripHorizontal,
  Heart,
  MicVocal,
  Rows2,
  X,
} from 'lucide-react';
import type {
  PlaybackActions,
  PlaybackState,
  PlayerSettings,
  Track,
} from '../../types/player';
import { AlbumArt } from '../ui/AlbumArt';
import { GlassArtworkBackdrop } from '../ui/GlassArtworkBackdrop';
import { IconButton } from '../ui/IconButton';
import { PlaybackControls } from '../ui/PlaybackControls';
import { ProgressBar } from '../ui/ProgressBar';

interface FloatingMiniPlayerProps {
  track: Track;
  playback: PlaybackState;
  actions: PlaybackActions;
  settings: PlayerSettings;
  layout: 'horizontal' | 'vertical';
  onToggleLayout: () => void;
  onToggleLyrics: () => void;
  onClose: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  elevated?: boolean;
}

export const FloatingMiniPlayer: React.FC<FloatingMiniPlayerProps> = ({
  track,
  playback,
  actions,
  settings,
  layout,
  onToggleLayout,
  onToggleLyrics,
  onClose,
  dragHandleProps,
  elevated = false,
}) => {
  const compact = settings.compactMode;
  const controlsDisabled = playback.connectionStatus !== 'connected';
  const windowClass = elevated ? 'mini-window-floating' : 'mini-window';

  if (layout === 'vertical') {
    return (
      <section
        aria-label="Floating Mini Player (Vertical)"
        className={`${windowClass} group relative rounded-[var(--radius-window)] overflow-hidden transition-[width,padding] duration-200 ${
          compact ? 'w-[236px]' : 'w-[264px]'
        }`}
      >
        {/* macOS frosted artwork vibrancy */}
        <GlassArtworkBackdrop
          artwork={track.artwork}
          isLight={settings.theme === 'light'}
        />

        {/* Top Chrome Bar */}
        <div
          {...dragHandleProps}
          className={`relative flex items-center justify-between px-3 pt-2.5 pb-1 ${
            dragHandleProps ? 'cursor-grab active:cursor-grabbing' : ''
          }`}
        >
          <div className="flex items-center gap-1">
            <IconButton
              label="Switch to horizontal layout"
              size="sm"
              onClick={onToggleLayout}
            >
              <Rows2 size={14} />
            </IconButton>
            <IconButton
              label="Switch to synchronized lyrics"
              size="sm"
              onClick={onToggleLyrics}
            >
              <MicVocal size={14} />
            </IconButton>
          </div>

          {dragHandleProps && (
            <GripHorizontal
              size={14}
              className="text-[var(--text-muted)] opacity-50 group-hover:opacity-90 transition-opacity"
              aria-hidden="true"
            />
          )}

          <IconButton label="Close floating player" size="sm" onClick={onClose}>
            <X size={14} />
          </IconButton>
        </div>

        {/* Artwork + Info + Controls */}
        <div className={`relative ${compact ? 'px-4 pb-4 pt-1.5 space-y-3' : 'px-5 pb-5 pt-2 space-y-3.5'}`}>
          <div className="flex justify-center">
            <AlbumArt
              track={track}
              size="fill"
              isPlaying={playback.isPlaying && !controlsDisabled}
              className={compact ? 'max-w-[168px]' : 'max-w-[208px]'}
            />
          </div>

          <div className="flex items-start justify-between gap-2 pt-0.5">
            <div className="min-w-0">
              <h3 className="font-display text-[15px] font-semibold tracking-[-0.015em] text-[var(--text-primary)] truncate">
                {track.title}
              </h3>
              <p className="text-[12.5px] text-[var(--text-secondary)] truncate mt-0.5">
                {track.artist}
              </p>
            </div>
            <IconButton
              label={playback.isLiked ? 'Unlike song' : 'Like song'}
              active={playback.isLiked}
              size="sm"
              disabled={controlsDisabled}
              onClick={actions.toggleLike}
            >
              <Heart size={14} className={playback.isLiked ? 'fill-current' : ''} />
            </IconButton>
          </div>

          <ProgressBar
            currentTimeSec={playback.currentTimeSec}
            durationSec={track.durationSec}
            onSeek={actions.seekTo}
            disabled={controlsDisabled}
            compact={compact}
          />

          <PlaybackControls
            isPlaying={playback.isPlaying}
            onTogglePlay={actions.togglePlay}
            onPrev={actions.prevTrack}
            onNext={actions.nextTrack}
            size={compact ? 'compact' : 'default'}
            disabled={controlsDisabled}
          />
        </div>
      </section>
    );
  }

  // Horizontal Floating Mini Player
  return (
    <section
      aria-label="Floating Mini Player (Horizontal)"
      className={`${windowClass} group relative rounded-[18px] overflow-hidden transition-[width,padding] duration-200 ${
        compact ? 'w-full max-w-[396px]' : 'w-full max-w-[464px]'
      }`}
    >
      {/* macOS frosted artwork vibrancy */}
      <GlassArtworkBackdrop
        artwork={track.artwork}
        isLight={settings.theme === 'light'}
      />

      <div className={`relative ${compact ? 'px-3.5 py-3' : 'px-4 py-3.5'}`}>
        {/* Top Row: Art + Metadata + Transport + Window Controls */}
        <div
          {...dragHandleProps}
          className={`flex items-center gap-3.5 ${
            dragHandleProps ? 'cursor-grab active:cursor-grabbing' : ''
          }`}
        >
          <AlbumArt
            track={track}
            size={compact ? 'sm' : 'md'}
            isPlaying={playback.isPlaying && !controlsDisabled}
          />

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-display text-[14.5px] font-semibold tracking-[-0.015em] text-[var(--text-primary)] truncate">
                  {track.title}
                </h3>
                <p className="text-[12.5px] text-[var(--text-secondary)] truncate">
                  {track.artist}
                </p>
              </div>

              {/* Window Utility Controls */}
              <div
                className="flex items-center gap-0.5 shrink-0"
                onPointerDown={(e) => e.stopPropagation()}
              >
                <IconButton
                  label="Open synchronized lyrics"
                  size="sm"
                  onClick={onToggleLyrics}
                >
                  <MicVocal size={14} />
                </IconButton>
                <IconButton
                  label="Switch to vertical layout"
                  size="sm"
                  onClick={onToggleLayout}
                >
                  <Columns2 size={14} />
                </IconButton>
                <IconButton label="Close floating player" size="sm" onClick={onClose}>
                  <X size={14} />
                </IconButton>
              </div>
            </div>

            {/* Bottom inline row: Playback Controls + Progress */}
            <div
              className={`flex items-center gap-3 ${compact ? 'mt-1.5' : 'mt-2.5'}`}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <PlaybackControls
                isPlaying={playback.isPlaying}
                onTogglePlay={actions.togglePlay}
                onPrev={actions.prevTrack}
                onNext={actions.nextTrack}
                size="compact"
                disabled={controlsDisabled}
              />

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
          </div>
        </div>
      </div>
    </section>
  );
};
