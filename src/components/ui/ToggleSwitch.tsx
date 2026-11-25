import React from 'react';

interface ToggleSwitchProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  id,
  checked,
  onChange,
  label,
  description,
}) => {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <label
          htmlFor={id}
          className="block text-[14px] font-medium text-[var(--text-primary)] cursor-pointer"
        >
          {label}
        </label>
        {description && (
          <p className="mt-0.5 text-[12.5px] leading-snug text-[var(--text-secondary)]">
            {description}
          </p>
        )}
      </div>

      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer ${
          checked
            ? 'bg-[var(--accent-primary)]'
            : 'bg-[var(--surface-active)] border border-[var(--border-hairline)]'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
};
