import React from 'react';
import type { TrackArtworkSpec } from '../../types/player';

interface GlassArtworkBackdropProps {
  artwork: TrackArtworkSpec;
  isLight?: boolean;
  intense?: boolean;
}

/**
 * Renders a blurred, color-saturated album-art atmospheric backdrop behind
 * frosted macOS glass panels so backdrop-filter blurs rich real colors.
 */
export const GlassArtworkBackdrop: React.FC<GlassArtworkBackdropProps> = ({
  artwork,
  isLight = false,
  intense = false,
}) => {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
      aria-hidden="true"
    >
      {artwork.imageUrl ? (
        <img
          src={artwork.imageUrl}
          alt=""
          className={`absolute inset-0 w-full h-full object-cover scale-125 transition-opacity duration-700 ${
            intense
              ? isLight
                ? 'opacity-45 blur-3xl saturate-150'
                : 'opacity-55 blur-3xl saturate-150 brightness-75'
              : isLight
                ? 'opacity-30 blur-3xl saturate-150'
                : 'opacity-40 blur-3xl saturate-150 brightness-65'
          }`}
        />
      ) : null}

      <div
        className="absolute inset-0 transition-colors duration-700"
        style={{
          background: isLight
            ? `radial-gradient(circle at 22% 18%, ${artwork.accentHue}, transparent 62%), radial-gradient(circle at 85% 82%, ${artwork.secondaryColor}33, transparent 60%)`
            : `radial-gradient(circle at 22% 18%, ${artwork.ambientColor}88, transparent 64%), radial-gradient(circle at 82% 84%, ${artwork.secondaryColor}44, transparent 58%)`,
        }}
      />
    </div>
  );
};
