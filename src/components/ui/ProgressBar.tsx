import React, { useCallback, useRef } from 'react';
import { formatTime } from '../../services/mockPlayerAdapter';

interface ProgressBarProps {
  currentTimeSec: number;
  durationSec: number;
  onSeek: (timeSec: number) => void;
  showTimestamps?: boolean;
  timestampPlacement?: 'inline' | 'below';
  disabled?: boolean;
  compact?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  currentTimeSec,
  durationSec,
  onSeek,
  showTimestamps = true,
  timestampPlacement = 'below',
  disabled = false,
  compact = false,
  className = '',
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const progressPct = durationSec > 0 ? Math.min(100, Math.max(0, (currentTimeSec / durationSec) * 100)) : 0;

  const calculateTimeFromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el || durationSec <= 0) return 0;
      const rect = el.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      return Math.round(ratio * durationSec);
    },
    [durationSec]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    onSeek(calculateTimeFromClientX(e.clientX));
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
    onSeek(calculateTimeFromClientX(e.clientX));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      onSeek(Math.min(durationSec, currentTimeSec + 5));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      onSeek(Math.max(0, currentTimeSec - 5));
    } else if (e.key === 'Home') {
      e.preventDefault();
      onSeek(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      onSeek(durationSec);
    }
  };

  const sliderElement = (
    <div
      ref={trackRef}
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label="Track playback position"
      aria-valuemin={0}
      aria-valuemax={durationSec}
      aria-valuenow={Math.floor(currentTimeSec)}
      aria-valuetext={`${formatTime(currentTimeSec)} of ${formatTime(durationSec)}`}
      aria-disabled={disabled}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onKeyDown={handleKeyDown}
      className={`group relative flex-1 flex items-center select-none touch-none ${
        compact ? 'h-4' : 'h-5'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <div className="relative w-full h-[4px] group-hover:h-[5px] rounded-full bg-[var(--progress-track)] transition-[height] duration-150 overflow-hidden">
        <div
          className="h-full rounded-full bg-[var(--accent-primary)] transition-[width] duration-100 ease-linear"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      {!disabled && (
        <div
          className="pointer-events-none absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[var(--text-primary)] shadow-[0_1px_6px_rgba(0,0,0,0.55)] opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 group-focus-visible:opacity-100 group-focus-visible:scale-100 transition-[opacity,transform] duration-150"
          style={{ left: `${progressPct}%` }}
        />
      )}
    </div>
  );

  if (showTimestamps && timestampPlacement === 'inline') {
    return (
      <div className={`flex items-center gap-2.5 ${className}`}>
        <span className="font-mono-tabular text-[11px] leading-none text-[var(--text-muted)] w-8 text-right shrink-0">
          {formatTime(currentTimeSec)}
        </span>
        {sliderElement}
        <span className="font-mono-tabular text-[11px] leading-none text-[var(--text-muted)] w-8 text-left shrink-0">
          {formatTime(durationSec)}
        </span>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      {sliderElement}
      {showTimestamps && (
        <div className="flex items-center justify-between mt-0.5">
          <span className="font-mono-tabular text-[11px] leading-none text-[var(--text-muted)]">
            {formatTime(currentTimeSec)}
          </span>
          <span className="font-mono-tabular text-[11px] leading-none text-[var(--text-muted)]">
            {formatTime(durationSec)}
          </span>
        </div>
      )}
    </div>
  );
};
