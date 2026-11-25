import React, { useEffect, useRef, useState } from 'react';
import type {
  FloatingDisplayMode,
  LyricsLoadStatus,
  PlaybackActions,
  PlaybackState,
  PlayerSettings,
  Track,
} from '../../types/player';
import { CombinedPlayerLyricsView } from '../views/CombinedPlayerLyricsView';
import { FloatingLyricsView } from '../views/FloatingLyricsView';
import { FloatingMiniPlayer } from '../views/FloatingMiniPlayer';

interface DraggableFloatingOverlayProps {
  mode: FloatingDisplayMode;
  onChangeMode: (mode: FloatingDisplayMode) => void;
  onClose: () => void;
  track: Track;
  playback: PlaybackState;
  actions: PlaybackActions;
  settings: PlayerSettings;
  lyricsStatus: LyricsLoadStatus;
}

export const DraggableFloatingOverlay: React.FC<DraggableFloatingOverlayProps> = ({
  mode,
  onChangeMode,
  onClose,
  track,
  playback,
  actions,
  settings,
  lyricsStatus,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{
    dragging: boolean;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  }>({ dragging: false, startX: 0, startY: 0, originX: 0, originY: 0 });

  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, input, [role="slider"]')) {
      return;
    }
    dragStateRef.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      originX: offset.x,
      originY: offset.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current.dragging) return;
    const dx = e.clientX - dragStateRef.current.startX;
    const dy = e.clientY - dragStateRef.current.startY;
    setOffset({
      x: dragStateRef.current.originX + dx,
      y: dragStateRef.current.originY + dy,
    });
  };

  const handlePointerUp = () => {
    dragStateRef.current.dragging = false;
  };

  const dragHandleProps: React.HTMLAttributes<HTMLDivElement> = {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
  };

  return (
    <div
      ref={wrapperRef}
      role="dialog"
      aria-label="Live Floating Player Window"
      className="fixed bottom-6 right-6 z-50 max-w-[calc(100vw-2rem)]"
      style={{
        transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
      }}
    >
      {/* Quick Floating Mode Switcher Dock above the window */}
      <div className="mb-2 flex justify-end">
        <div className="mac-glass-dock inline-flex items-center gap-0.5 p-1 rounded-full">
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
              onClick={() => onChangeMode(id)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-[background-color,color,box-shadow] cursor-pointer whitespace-nowrap ${
                mode === id
                  ? 'bg-[var(--surface-active)] text-[var(--text-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'mini-horizontal' && (
        <FloatingMiniPlayer
          track={track}
          playback={playback}
          actions={actions}
          settings={settings}
          layout="horizontal"
          onToggleLayout={() => onChangeMode('mini-vertical')}
          onToggleLyrics={() => onChangeMode('lyrics')}
          onClose={onClose}
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
          onToggleLayout={() => onChangeMode('mini-horizontal')}
          onToggleLyrics={() => onChangeMode('lyrics')}
          onClose={onClose}
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
          onSwitchToMiniPlayer={() => onChangeMode('mini-horizontal')}
          onClose={onClose}
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
          onSwitchToMiniPlayer={() => onChangeMode('mini-horizontal')}
          onClose={onClose}
          dragHandleProps={dragHandleProps}
          elevated
        />
      )}
    </div>
  );
};
