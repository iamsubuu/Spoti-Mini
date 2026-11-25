import React from 'react';
import {
  GripHorizontal,
  Heart,
  Minimize2,
  X,
} from 'lucide-react';
import type {
  CombinedSizePreset,
  LyricsLoadStatus,
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
import { SynchronizedLyrics } from '../ui/SynchronizedLyrics';
import { VolumeControl } from '../ui/VolumeControl';

interface CombinedPlayerLyricsViewProps {
  track: Track;
  playback: PlaybackState;
  actions: PlaybackActions;
  settings: PlayerSettings;
  lyricsStatus: LyricsLoadStatus;
  sizePreset?: CombinedSizePreset;
  onSwitchToMiniPlayer: () => void;
  onClose: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  elevated?: boolean;
  fillViewport?: boolean;
}

const PRESET_CLASSES: Record<CombinedSizePreset, string> = {
  wide: 'max-w-[780px] md:h-[444px]',
  medium: 'max-w-[640px] md:h-[420px]',
  narrow: 'max-w-[388px] h-[560px]',
};

export const CombinedPlayerLyricsView: React.FC<CombinedPlayerLyricsViewProps> = ({
  track,
  playback,
  actions,
  settings,
  lyricsStatus,
  sizePreset = 'wide',
  onSwitchToMiniPlayer,
  onClose,
  dragHandleProps,
  elevated = false,
  fillViewport = false,
}) => {
  const compact = settings.compactMode;
  const controlsDisabled = playback.connectionStatus !== 'connected';
  const isStacked = sizePreset === 'narrow';
  const windowClass = elevated ? 'mini-window-floating' : 'mini-window';

  return (
    <section
      aria-label="Combined Floating Player and Lyrics"
      className={`${windowClass} relative w-full rounded-[var(--radius-window)] overflow-hidden flex flex-col transition-[max-width,height] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        fillViewport ? 'max-w-[640px] flex-1 min-h-0 max-h-[440px]' : PRESET_CLASSES[sizePreset]
      }`}
    >
      {/* macOS frosted artwork vibrancy */}
      <GlassArtworkBackdrop
        artwork={track.artwork}
        isLight={settings.theme === 'light'}
      />

      {/* Window Title Bar */}
      <header
        {...dragHandleProps}
        className={`relative flex items-center justify-between border-b border-[var(--border-hairline)] shrink-0 ${
          compact ? 'px-4 py-2' : 'px-5 py-2.5'
        } ${dragHandleProps ? 'cursor-grab active:cursor-grabbing' : ''}`}
      >
        <div className="flex items-center gap-2 text-[12px] text-[var(--text-muted)]">
          <span className="font-display font-semibold text-[var(--text-secondary)]">
            Now Playing
          </span>
          <span aria-hidden="true">·</span>
          <span className="truncate">{track.album}</span>
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
          <IconButton
            label="Collapse to mini player"
            size="sm"
            onClick={onSwitchToMiniPlayer}
          >
            <Minimize2 size={14} />
          </IconButton>
          <IconButton label="Close window" size="sm" onClick={onClose}>
            <X size={15} />
          </IconButton>
        </div>
      </header>

      {/* Responsive Body: Side-by-Side (wide/medium on md+) or Stacked (narrow / mobile) */}
      <div
        className={`relative flex-1 min-h-0 flex ${
          isStacked ? 'flex-col' : 'flex-col md:flex-row'
        }`}
      >
        {/* Player Pane */}
        <div
          className={`shrink-0 flex flex-col justify-between ${
            isStacked
              ? `border-b border-[var(--border-hairline)] ${compact ? 'p-4 gap-3' : 'p-5 gap-3.5'}`
              : `border-b md:border-b-0 md:border-r border-[var(--border-hairline)] ${
                  sizePreset === 'medium' ? 'md:w-[258px]' : 'md:w-[300px]'
                } ${compact ? 'p-4 gap-3' : 'p-6 gap-4'}`
          }`}
        >
          {isStacked ? (
            <>
              {/* Compact Stacked Header Player */}
              <div className="flex items-center gap-3.5">
                <AlbumArt
                  track={track}
                  size={compact ? 'sm' : 'md'}
                  isPlaying={playback.isPlaying && !controlsDisabled}
                />
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-[15px] font-semibold text-[var(--text-primary)] truncate">
                    {track.title}
                  </h2>
                  <p className="text-[12.5px] text-[var(--text-secondary)] truncate mt-0.5">
                    {track.artist}
                  </p>
                </div>
                <IconButton
                  label={playback.isLiked ? 'Unlike track' : 'Like track'}
                  active={playback.isLiked}
                  size="sm"
                  disabled={controlsDisabled}
                  onClick={actions.toggleLike}
                >
                  <Heart size={15} className={playback.isLiked ? 'fill-current' : ''} />
                </IconButton>
              </div>

              <ProgressBar
                currentTimeSec={playback.currentTimeSec}
                durationSec={track.durationSec}
                onSeek={actions.seekTo}
                disabled={controlsDisabled}
                compact
              />

              <div className="flex items-center justify-between gap-2">
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
                  size="compact"
                  disabled={controlsDisabled}
                />
              </div>
            </>
          ) : (
            <>
              {/* Side-by-Side Left Player Column */}
              <div className="flex md:flex-col items-center md:items-stretch gap-4">
                <div className="shrink-0 md:flex md:justify-center">
                  <AlbumArt
                    track={track}
                    size={compact ? 'lg' : 'xl'}
                    isPlaying={playback.isPlaying && !controlsDisabled}
                    className="w-20 h-20 md:w-44 md:h-44"
                  />
                </div>

                <div className="min-w-0 flex-1 md:flex-none flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="font-display text-[16px] font-semibold tracking-[-0.015em] text-[var(--text-primary)] truncate">
                      {track.title}
                    </h2>
                    <p className="text-[13px] text-[var(--text-secondary)] truncate mt-0.5">
                      {track.artist}
                    </p>
                  </div>
                  <IconButton
                    label={playback.isLiked ? 'Unlike track' : 'Like track'}
                    active={playback.isLiked}
                    size="sm"
                    disabled={controlsDisabled}
                    onClick={actions.toggleLike}
                  >
                    <Heart size={15} className={playback.isLiked ? 'fill-current' : ''} />
                  </IconButton>
                </div>
              </div>

              <div className="space-y-3">
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
                  shuffle={playback.shuffle}
                  onToggleShuffle={actions.toggleShuffle}
                  repeat={playback.repeat}
                  onCycleRepeat={actions.cycleRepeat}
                  showSecondary
                  size={compact ? 'compact' : 'default'}
                  disabled={controlsDisabled}
                />

                <div className="hidden md:flex items-center justify-center pt-0.5">
                  <VolumeControl
                    volume={playback.volume}
                    isMuted={playback.isMuted}
                    onVolumeChange={actions.setVolume}
                    onToggleMute={actions.toggleMute}
                    disabled={controlsDisabled}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Synchronized Lyrics Pane */}
        <div className="flex-1 min-h-[260px] md:min-h-0 flex flex-col">
          <SynchronizedLyrics
            track={track}
            currentTimeSec={playback.currentTimeSec}
            fontSize={settings.lyricsFontSize}
            status={lyricsStatus}
            compact={compact || isStacked}
            activeIndexOverride={playback.activeLyricIndexOverride}
            onSeekToLine={actions.seekTo}
            onClickLine={actions.seekToLyricLine}
            onSwitchToPlayer={onSwitchToMiniPlayer}
            onRetryLyrics={
              actions.retryLyrics ?? (() => actions.setLyricsStatusOverride('auto'))
            }
          />
        </div>
      </div>
    </section>
  );
};
