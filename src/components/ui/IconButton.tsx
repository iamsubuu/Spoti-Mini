import React from 'react';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  active?: boolean;
  variant?: 'ghost' | 'surface' | 'accent';
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_MAP: Record<NonNullable<IconButtonProps['size']>, string> = {
  sm: 'w-8 h-8 rounded-[9px]',
  md: 'w-9 h-9 rounded-[10px]',
  lg: 'w-11 h-11 rounded-full',
};

export const IconButton: React.FC<IconButtonProps> = ({
  label,
  active = false,
  variant = 'ghost',
  size = 'md',
  className = '',
  disabled,
  children,
  ...rest
}) => {
  let variantClasses = '';

  if (variant === 'accent') {
    variantClasses =
      'bg-[var(--accent-primary)] text-[var(--accent-contrast)] hover:bg-[var(--accent-hover)] active:scale-[0.95] shadow-[0_6px_18px_-4px_rgba(29,185,84,0.45)]';
  } else if (variant === 'surface') {
    variantClasses = active
      ? 'bg-[var(--accent-muted)] text-[var(--accent-primary)] hover:bg-[var(--accent-muted)]'
      : 'bg-[var(--surface-interactive)] text-[var(--text-secondary)] hover:bg-[var(--surface-interactive-hover)] hover:text-[var(--text-primary)] active:scale-[0.96]';
  } else {
    variantClasses = active
      ? 'bg-[var(--accent-muted)] text-[var(--accent-primary)]'
      : 'text-[var(--text-secondary)] hover:bg-[var(--surface-interactive)] hover:text-[var(--text-primary)] active:scale-[0.95]';
  }

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active || undefined}
      disabled={disabled}
      className={`inline-flex items-center justify-center shrink-0 transition-[background-color,color,transform,opacity] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer disabled:opacity-35 disabled:pointer-events-none ${SIZE_MAP[size]} ${variantClasses} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
};
