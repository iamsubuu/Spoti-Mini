import React from 'react';
import {
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import { IconButton } from './IconButton';

interface PlaybackControlsProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  shuffle?: boolean;
  onToggleShuffle?: () => void;
  repeat?: 'off' | 'all' | 'one';
  onCycleRepeat?: () => void;
  showSecondary?: boolean;
  size?: 'compact' | 'default' | 'large';
  disabled?: boolean;
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  isPlaying,
  onTogglePlay,
  onPrev,
  onNext,
  shuffle = false,
  onToggleShuffle,
  repeat = 'off',
  onCycleRepeat,
  showSecondary = false,
  size = 'default',
  disabled = false,
}) => {
  const playSize = size === 'compact' ? 'w-9 h-9' : size === 'large' ? 'w-12 h-12' : 'w-10 h-10';
  const playIconSize = size === 'compact' ? 16 : size === 'large' ? 20 : 18;
  const skipIconSize = size === 'compact' ? 15 : 17;

  return (
    <div className="flex items-center justify-center gap-1.5" role="group" aria-label="Playback controls">
      {showSecondary && onToggleShuffle && (
        <IconButton
          label={shuffle ? 'Disable shuffle' : 'Enable shuffle'}
          active={shuffle}
          size="sm"
          disabled={disabled}
          onClick={onToggleShuffle}
        >
          <Shuffle size={15} />
        </IconButton>
      )}

      <IconButton
        label="Previous track"
        size={size === 'compact' ? 'sm' : 'md'}
        disabled={disabled}
        onClick={onPrev}
      >
        <SkipBack size={skipIconSize} className="fill-current" />
      </IconButton>

      <button
        type="button"
        aria-label={isPlaying ? 'Pause' : 'Play'}
        title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
        disabled={disabled}
        onClick={onTogglePlay}
        className={`${playSize} rounded-full inline-flex items-center justify-center shrink-0 bg-[var(--accent-primary)] text-[var(--accent-contrast)] hover:bg-[var(--accent-hover)] active:scale-[0.94] transition-[background-color,transform,box-shadow] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-[0_8px_22px_-6px_rgba(29,185,84,0.52)] cursor-pointer disabled:opacity-35 disabled:pointer-events-none`}
      >
        {isPlaying ? (
          <Pause size={playIconSize} className="fill-current" />
        ) : (
          <Play size={playIconSize} className="fill-current translate-x-[1px]" />
        )}
      </button>

      <IconButton
        label="Next track"
        size={size === 'compact' ? 'sm' : 'md'}
        disabled={disabled}
        onClick={onNext}
      >
        <SkipForward size={skipIconSize} className="fill-current" />
      </IconButton>

      {showSecondary && onCycleRepeat && (
        <IconButton
          label={
            repeat === 'off'
              ? 'Enable repeat all'
              : repeat === 'all'
                ? 'Enable repeat one'
                : 'Disable repeat'
          }
          active={repeat !== 'off'}
          size="sm"
          disabled={disabled}
          onClick={onCycleRepeat}
        >
          {repeat === 'one' ? <Repeat1 size={15} /> : <Repeat size={15} />}
        </IconButton>
      )}
    </div>
  );
};
