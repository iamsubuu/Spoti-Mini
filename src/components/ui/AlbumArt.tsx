import React from 'react';
import type { Track } from '../../types/player';

interface AlbumArtProps {
  track: Track;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'fill';
  isPlaying?: boolean;
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<AlbumArtProps['size']>, string> = {
  xs: 'w-10 h-10 rounded-[8px]',
  sm: 'w-12 h-12 rounded-[10px]',
  md: 'w-16 h-16 rounded-[12px]',
  lg: 'w-24 h-24 rounded-[14px]',
  xl: 'w-44 h-44 rounded-[16px]',
  fill: 'w-full aspect-square rounded-[14px]',
};

/**
 * Editorial vector album artwork renderer.
 * Renders distinct, gallery-grade album sleeves for each sample track
 * with crisp geometry, subtle depth, and zero external image dependencies.
 */
export const AlbumArt: React.FC<AlbumArtProps> = ({
  track,
  size = 'md',
  isPlaying = false,
  className = '',
}) => {
  const { artwork, title, artist } = track;
  const uid = `${artwork.id}-${size}`;
  const [imgFailed, setImgFailed] = React.useState(false);

  React.useEffect(() => {
    setImgFailed(false);
  }, [artwork.imageUrl]);

  const showImage = Boolean(artwork.imageUrl && !imgFailed);

  return (
    <div
      className={`relative shrink-0 overflow-hidden select-none shadow-[0_10px_28px_-8px_rgba(0,0,0,0.55)] ring-1 ring-inset ring-white/12 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isPlaying ? 'scale-100' : 'scale-[0.985]'
      } ${SIZE_CLASSES[size]} ${className}`}
      role="img"
      aria-label={`Album artwork for ${title} by ${artist}`}
    >
      {showImage ? (
        <img
          src={artwork.imageUrl}
          alt={`${title} by ${artist}`}
          className="w-full h-full object-cover block"
          onError={() => setImgFailed(true)}
        />
      ) : null}

      {!showImage && artwork.id === 'nocturne' && (
        <svg viewBox="0 0 320 320" className="w-full h-full block" aria-hidden="true">
          <defs>
            <linearGradient id={`bg-${uid}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#09111f" />
              <stop offset="52%" stopColor="#12233d" />
              <stop offset="100%" stopColor="#070a10" />
            </linearGradient>
            <radialGradient id={`amber-${uid}`} cx="72%" cy="32%" r="48%">
              <stop offset="0%" stopColor="#e8a750" stopOpacity="0.88" />
              <stop offset="45%" stopColor="#b86b2a" stopOpacity="0.34" />
              <stop offset="100%" stopColor="#12233d" stopOpacity="0" />
            </radialGradient>
            <radialGradient id={`blue-${uid}`} cx="24%" cy="76%" r="55%">
              <stop offset="0%" stopColor="#3a7ca5" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#09111f" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="320" height="320" fill={`url(#bg-${uid})`} />
          <rect width="320" height="320" fill={`url(#amber-${uid})`} />
          <rect width="320" height="320" fill={`url(#blue-${uid})`} />
          {/* Rain-streaked glass reflections & horizon transit lines */}
          <g opacity="0.22" stroke="#dce9f7" strokeWidth="1.2">
            <line x1="48" y1="0" x2="48" y2="320" />
            <line x1="96" y1="0" x2="96" y2="320" />
            <line x1="164" y1="0" x2="164" y2="320" />
            <line x1="232" y1="0" x2="232" y2="320" />
            <line x1="274" y1="0" x2="274" y2="320" />
          </g>
          <rect x="0" y="206" width="320" height="114" fill="#060b14" opacity="0.68" />
          <circle cx="228" cy="102" r="34" fill="#f3c47b" opacity="0.82" />
          <circle cx="228" cy="102" r="56" fill="#e8a750" opacity="0.18" />
          <rect x="196" y="218" width="64" height="5" rx="2.5" fill="#e8a750" opacity="0.72" />
          <rect x="206" y="234" width="44" height="3" rx="1.5" fill="#e8a750" opacity="0.45" />
          <rect x="214" y="248" width="28" height="2" rx="1" fill="#e8a750" opacity="0.28" />
          <line x1="0" y1="206" x2="320" y2="206" stroke="#9ec5e6" strokeOpacity="0.25" strokeWidth="1" />
        </svg>
      )}

      {!showImage && artwork.id === 'velvet' && (
        <svg viewBox="0 0 320 320" className="w-full h-full block" aria-hidden="true">
          <defs>
            <linearGradient id={`bg-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1b2230" />
              <stop offset="56%" stopColor="#354157" />
              <stop offset="100%" stopColor="#161b24" />
            </linearGradient>
            <linearGradient id={`mist-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c9d6e4" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#263042" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <rect width="320" height="320" fill={`url(#bg-${uid})`} />
          {/* Architectural brutalist coastal arch */}
          <path
            d="M0 320 L0 120 L76 120 L76 320 Z M244 320 L244 120 L320 120 L320 320 Z"
            fill="#10151e"
            opacity="0.86"
          />
          <path
            d="M52 320 L52 152 A108 108 0 0 1 268 152 L268 320 L214 320 L214 158 A54 54 0 0 0 106 158 L106 320 Z"
            fill="#232c3d"
            stroke="#c9d6e4"
            strokeOpacity="0.16"
            strokeWidth="1.5"
          />
          <circle cx="160" cy="148" r="32" fill={`url(#mist-${uid})`} />
          <rect x="0" y="236" width="320" height="84" fill={`url(#mist-${uid})`} opacity="0.42" />
          <line x1="106" y1="236" x2="214" y2="236" stroke="#d8e3ef" strokeOpacity="0.35" strokeWidth="1" />
        </svg>
      )}

      {!showImage && artwork.id === 'solar' && (
        <svg viewBox="0 0 320 320" className="w-full h-full block" aria-hidden="true">
          <defs>
            <linearGradient id={`bg-${uid}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#d89d56" />
              <stop offset="52%" stopColor="#a96b36" />
              <stop offset="100%" stopColor="#3b2314" />
            </linearGradient>
            <radialGradient id={`sun-${uid}`} cx="32%" cy="28%" r="58%">
              <stop offset="0%" stopColor="#f8dca8" stopOpacity="0.92" />
              <stop offset="60%" stopColor="#cf8c45" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#3b2314" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="320" height="320" fill={`url(#bg-${uid})`} />
          <rect width="320" height="320" fill={`url(#sun-${uid})`} />
          {/* Diagonal limestone shadow planes */}
          <polygon points="0,320 320,128 320,320" fill="#23140b" opacity="0.62" />
          <polygon points="0,248 260,0 320,0 320,42 0,298" fill="#2b170d" opacity="0.32" />
          <polygon points="104,320 320,186 320,232 178,320" fill="#f7d6a0" opacity="0.18" />
          <circle cx="96" cy="96" r="46" fill="#fbe4b8" opacity="0.72" />
        </svg>
      )}

      {!showImage && artwork.id === 'meridian' && (
        <svg viewBox="0 0 320 320" className="w-full h-full block" aria-hidden="true">
          <defs>
            <linearGradient id={`bg-${uid}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#0a1914" />
              <stop offset="50%" stopColor="#133328" />
              <stop offset="100%" stopColor="#09100e" />
            </linearGradient>
            <radialGradient id={`prism-${uid}`} cx="54%" cy="46%" r="52%">
              <stop offset="0%" stopColor="#39b879" stopOpacity="0.6" />
              <stop offset="55%" stopColor="#1d6346" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#09100e" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="320" height="320" fill={`url(#bg-${uid})`} />
          <rect width="320" height="320" fill={`url(#prism-${uid})`} />
          {/* Fluted architectural glass ribs */}
          {Array.from({ length: 12 }).map((_, idx) => {
            const x = idx * 27;
            return (
              <rect
                key={idx}
                x={x}
                y="0"
                width="14"
                height="320"
                fill="#c2f0d9"
                opacity={idx % 2 === 0 ? 0.06 : 0.11}
              />
            );
          })}
          <circle
            cx="160"
            cy="160"
            r="74"
            fill="none"
            stroke="#8ae6b8"
            strokeOpacity="0.32"
            strokeWidth="1.5"
          />
          <circle
            cx="160"
            cy="160"
            r="44"
            fill="#28945f"
            fillOpacity="0.24"
            stroke="#a8f0cb"
            strokeOpacity="0.4"
            strokeWidth="1"
          />
        </svg>
      )}

      {/* Subtle top glass bevel highlight */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/14 via-transparent to-black/28"
        aria-hidden="true"
      />
    </div>
  );
};
