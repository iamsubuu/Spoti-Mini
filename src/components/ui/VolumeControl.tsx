import React from 'react';
import { Volume1, Volume2, VolumeX } from 'lucide-react';
import { IconButton } from './IconButton';

interface VolumeControlProps {
  volume: number;
  isMuted: boolean;
  onVolumeChange: (value: number) => void;
  onToggleMute: () => void;
  disabled?: boolean;
}

export const VolumeControl: React.FC<VolumeControlProps> = ({
  volume,
  isMuted,
  onVolumeChange,
  onToggleMute,
  disabled = false,
}) => {
  const effectiveVolume = isMuted ? 0 : volume;
  const Icon = effectiveVolume === 0 ? VolumeX : effectiveVolume < 50 ? Volume1 : Volume2;

  return (
    <div className="flex items-center gap-1.5">
      <IconButton
        label={isMuted ? 'Unmute audio (M)' : 'Mute audio (M)'}
        size="sm"
        disabled={disabled}
        onClick={onToggleMute}
      >
        <Icon size={15} />
      </IconButton>
      <input
        type="range"
        min={0}
        max={100}
        value={effectiveVolume}
        disabled={disabled}
        onChange={(e) => onVolumeChange(Number(e.target.value))}
        aria-label="Playback volume"
        className="w-16 h-1 accent-[var(--accent-primary)] cursor-pointer disabled:opacity-35"
      />
    </div>
  );
};
