import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, Music2, RefreshCw } from 'lucide-react';
import type { LyricsFontSize, LyricsLoadStatus, Track } from '../../types/player';
import { formatTime, getActiveLyricIndex } from '../../services/mockPlayerAdapter';

interface SynchronizedLyricsProps {
  track: Track;
  currentTimeSec: number;
  fontSize: LyricsFontSize;
  status: LyricsLoadStatus;
  compact?: boolean;
  activeIndexOverride?: number | null;
  onSeekToLine: (timeSec: number) => void;
  onClickLine?: (index: number, timeSec: number) => void;
  onSwitchToPlayer?: () => void;
  onRetryLyrics?: () => void;
}

const FONT_SCALE: Record<LyricsFontSize, { active: string; inactive: string; gap: string }> = {
  sm: {
    active: 'text-[16px] leading-[1.45] font-semibold tracking-[-0.01em]',
    inactive: 'text-[15px] leading-[1.45] font-medium',
    gap: 'space-y-3',
  },
  md: {
    active: 'text-[21px] leading-[1.38] font-semibold tracking-[-0.015em]',
    inactive: 'text-[18.5px] leading-[1.42] font-medium',
    gap: 'space-y-4',
  },
  lg: {
    active: 'text-[26px] leading-[1.3] font-bold tracking-[-0.02em]',
    inactive: 'text-[22px] leading-[1.36] font-medium',
    gap: 'space-y-5',
  },
};

export const SynchronizedLyrics: React.FC<SynchronizedLyricsProps> = ({
  track,
  currentTimeSec,
  fontSize,
  status,
  compact = false,
  activeIndexOverride,
  onSeekToLine,
  onClickLine,
  onSwitchToPlayer,
  onRetryLyrics,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLButtonElement>(null);
  const userScrollingTimerRef = useRef<number | null>(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);

  const activeIndex = getActiveLyricIndex(
    track.lyrics,
    currentTimeSec,
    activeIndexOverride
  );
  const typography = FONT_SCALE[fontSize];

  useEffect(() => {
    setIsUserScrolling(false);
  }, [track.id]);

  useEffect(() => {
    if (status !== 'ready' || isUserScrolling) return;
    const container = containerRef.current;
    const activeEl = activeLineRef.current;
    if (!container || !activeEl) return;

    const containerHeight = container.clientHeight;
    const targetScrollTop =
      activeEl.offsetTop - containerHeight * 0.36 + activeEl.clientHeight / 2;

    container.scrollTo({
      top: Math.max(0, targetScrollTop),
      behavior: 'smooth',
    });
  }, [activeIndex, status, isUserScrolling, fontSize]);

  const handleManualWheelOrTouch = () => {
    setIsUserScrolling(true);
    if (userScrollingTimerRef.current) {
      window.clearTimeout(userScrollingTimerRef.current);
    }
    userScrollingTimerRef.current = window.setTimeout(() => {
      setIsUserScrolling(false);
    }, 5500);
  };

  useEffect(() => {
    return () => {
      if (userScrollingTimerRef.current) {
        window.clearTimeout(userScrollingTimerRef.current);
      }
    };
  }, []);

  if (status === 'loading') {
    const widths = ['78%', '62%', '86%', '54%', '74%', '66%', '48%'];
    return (
      <div
        className={`flex-1 flex flex-col justify-center ${compact ? 'px-4 py-5' : 'px-6 py-7'}`}
        aria-busy="true"
        aria-label="Loading synchronized lyrics"
      >
        <div className="space-y-4">
          {widths.map((w, i) => (
            <div
              key={i}
              className={`rounded-md bg-[var(--surface-interactive-hover)] animate-pulse ${
                i === 2 ? 'h-6' : 'h-5'
              }`}
              style={{
                width: w,
                opacity: i === 2 ? 0.9 : 0.45,
                animationDelay: `${i * 75}ms`,
              }}
            />
          ))}
        </div>
        <p className="mt-6 text-[12.5px] text-[var(--text-muted)]">
          Fetching synchronized lyrics for {track.title}…
        </p>
      </div>
    );
  }

  if (status === 'empty' || track.lyrics.length === 0) {
    return (
      <div
        className={`flex-1 flex flex-col items-center justify-center text-center ${
          compact ? 'px-5 py-8' : 'px-7 py-10'
        }`}
      >
        <div className="w-11 h-11 rounded-[12px] bg-[var(--surface-interactive)] border border-[var(--border-hairline)] flex items-center justify-center text-[var(--text-muted)] mb-4">
          <Music2 size={20} />
        </div>
        <h3 className="font-display text-[15px] font-semibold text-[var(--text-primary)]">
          {track.isInstrumental ? 'Instrumental Track' : 'No Synchronized Lyrics'}
        </h3>
        <p className="mt-1.5 max-w-[260px] text-[13px] leading-relaxed text-[var(--text-secondary)]">
          {track.isInstrumental
            ? `${track.title} has no vocal lyrics. Sit back and enjoy the arrangement.`
            : `Timed lyrics aren’t available for ${track.title} right now.`}
        </p>
        <div className="mt-5 flex items-center gap-2">
          {onRetryLyrics && !track.isInstrumental && (
            <button
              type="button"
              onClick={onRetryLyrics}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-[12.5px] font-medium bg-[var(--surface-interactive)] hover:bg-[var(--surface-interactive-hover)] text-[var(--text-primary)] transition-colors duration-150 cursor-pointer whitespace-nowrap"
            >
              <RefreshCw size={13} />
              Check again
            </button>
          )}
          {onSwitchToPlayer && (
            <button
              type="button"
              onClick={onSwitchToPlayer}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-[12.5px] font-medium bg-[var(--accent-muted)] text-[var(--accent-primary)] hover:bg-[var(--accent-primary)] hover:text-[var(--accent-contrast)] transition-colors duration-150 cursor-pointer whitespace-nowrap"
            >
              Back to Player
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 min-h-0 flex flex-col">
      <div
        ref={containerRef}
        onWheel={handleManualWheelOrTouch}
        onTouchMove={handleManualWheelOrTouch}
        className={`lyrics-scroll lyrics-mask flex-1 overflow-y-auto scroll-smooth ${
          compact ? 'px-4 py-8' : 'px-6 py-12'
        }`}
        role="region"
        aria-label="Synchronized lyrics"
      >
        <div className={`${typography.gap} pb-24 pt-4`}>
          {track.lyrics.map((line, index) => {
            const isActive = index === activeIndex;
            const isPast = index < activeIndex;

            return (
              <button
                key={`${line.timeSec}-${index}`}
                ref={isActive ? activeLineRef : undefined}
                type="button"
                onClick={() => {
                  setIsUserScrolling(false);
                  if (onClickLine) {
                    onClickLine(index, line.timeSec);
                  } else if (line.timeSec >= 0) {
                    onSeekToLine(line.timeSec);
                  }
                }}
                aria-current={isActive ? 'true' : undefined}
                className={`group w-full text-left block rounded-[10px] px-2.5 py-1.5 -mx-2.5 transition-[color,opacity,transform,background-color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer focus-visible:outline-2 hover:bg-[var(--surface-interactive)] ${
                  isActive
                    ? `${typography.active} text-[var(--text-primary)] opacity-100 translate-x-0.5`
                    : isPast
                      ? `${typography.inactive} text-[var(--text-secondary)] opacity-35 hover:opacity-75`
                      : `${typography.inactive} text-[var(--text-secondary)] opacity-60 hover:opacity-90`
                }`}
              >
                <span className="flex items-baseline justify-between gap-3">
                  <span className="font-display">
                    {isActive && (
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] mr-2.5 align-middle -translate-y-[1px]"
                        aria-hidden="true"
                      />
                    )}
                    {line.text}
                  </span>
                  {line.timeSec >= 0 && (
                    <span className="font-mono-tabular text-[11px] text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0">
                      {formatTime(line.timeSec)}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {isUserScrolling && (
        <div className="pointer-events-none absolute bottom-3 inset-x-0 flex justify-center">
          <button
            type="button"
            onClick={() => setIsUserScrolling(false)}
            className="pointer-events-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium bg-[var(--surface-elevated)] text-[var(--text-primary)] border border-[var(--border-strong)] shadow-lg hover:bg-[var(--surface-active)] transition-colors duration-150 cursor-pointer whitespace-nowrap"
          >
            <ArrowDown size={13} className="text-[var(--accent-primary)]" />
            Sync to current line
          </button>
        </div>
      )}
    </div>
  );
};
