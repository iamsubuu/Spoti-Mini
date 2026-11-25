import React from 'react';

interface BrandMarkProps {
  size?: number;
  className?: string;
}

export const BrandMark: React.FC<BrandMarkProps> = ({ size = 20, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      <rect width="24" height="24" rx="7" fill="var(--accent-primary)" />
      <path
        d="M6.8 9.4C10.1 8.4 14.2 8.6 17.3 10.3"
        stroke="var(--accent-contrast)"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path
        d="M7.8 12.6C10.5 11.9 13.7 12.1 16.2 13.4"
        stroke="var(--accent-contrast)"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M8.8 15.6C10.9 15.1 13.2 15.3 15.1 16.3"
        stroke="var(--accent-contrast)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
};
