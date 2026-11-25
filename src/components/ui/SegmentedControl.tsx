import React from 'react';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  size = 'md',
  fullWidth = false,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`inline-flex items-center p-1 rounded-[11px] bg-[var(--surface-interactive)] border border-[var(--border-hairline)] ${
        fullWidth ? 'w-full' : ''
      }`}
    >
      {options.map((opt) => {
        const isSelected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(opt.value)}
            className={`relative whitespace-nowrap shrink-0 rounded-[8px] font-medium transition-[background-color,color,box-shadow] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer ${
              fullWidth ? 'flex-1 text-center' : ''
            } ${size === 'sm' ? 'px-2.5 py-1 text-[12px]' : 'px-3.5 py-1.5 text-[13px]'} ${
              isSelected
                ? 'bg-[var(--surface-elevated)] text-[var(--text-primary)] shadow-[0_2px_8px_rgba(0,0,0,0.22)] ring-1 ring-[var(--border-hairline)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
