import React from 'react';
import { ArrowLeft, Check, RotateCcw } from 'lucide-react';
import type {
  FloatingDisplayMode,
  LyricsFontSize,
  PlayerSettings,
  ThemeId,
} from '../../types/player';
import { DEFAULT_SETTINGS } from '../../services/mockPlayerAdapter';
import { SegmentedControl } from '../ui/SegmentedControl';
import { ToggleSwitch } from '../ui/ToggleSwitch';

interface SettingsViewProps {
  settings: PlayerSettings;
  onUpdateSettings: (patch: Partial<PlayerSettings>) => void;
  onResetSettings: () => void;
  onBack?: () => void;
}

const THEME_OPTIONS: {
  id: ThemeId;
  name: string;
  caption: string;
  bg: string;
  surface: string;
  text: string;
}[] = [
  {
    id: 'obsidian',
    name: 'Obsidian',
    caption: 'Deep charcoal',
    bg: '#090a0c',
    surface: '#1a1c20',
    text: '#f4f5f7',
  },
  {
    id: 'midnight',
    name: 'Midnight',
    caption: 'Cool slate',
    bg: '#080c12',
    surface: '#141e2e',
    text: '#f0f5fc',
  },
  {
    id: 'vinyl',
    name: 'Warm Vinyl',
    caption: 'Muted espresso',
    bg: '#0e0c0b',
    surface: '#221e1b',
    text: '#f6f1eb',
  },
  {
    id: 'light',
    name: 'Alabaster',
    caption: 'Studio light',
    bg: '#eff1f4',
    surface: '#ffffff',
    text: '#111318',
  },
];

const DISPLAY_MODE_OPTIONS: { value: FloatingDisplayMode; label: string; detail: string }[] = [
  {
    value: 'mini-horizontal',
    label: 'Mini Horizontal',
    detail: 'Slim floating bar along screen edges',
  },
  {
    value: 'mini-vertical',
    label: 'Mini Vertical',
    detail: 'Compact square card with prominent cover art',
  },
  {
    value: 'lyrics',
    label: 'Lyrics Only',
    detail: 'Focused synced lyrics with quiet mini footer',
  },
  {
    value: 'combined',
    label: 'Combined View',
    detail: 'Full controls paired alongside live lyrics',
  },
];

const PREVIEW_FONT_CLASS: Record<LyricsFontSize, string> = {
  sm: 'text-[15px]',
  md: 'text-[19px]',
  lg: 'text-[23px]',
};

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onResetSettings,
  onBack,
}) => {
  const isModified =
    settings.theme !== DEFAULT_SETTINGS.theme ||
    settings.lyricsFontSize !== DEFAULT_SETTINGS.lyricsFontSize ||
    settings.compactMode !== DEFAULT_SETTINGS.compactMode ||
    settings.autoOpenFloating !== DEFAULT_SETTINGS.autoOpenFloating ||
    settings.defaultDisplayMode !== DEFAULT_SETTINGS.defaultDisplayMode ||
    settings.lrclibEnabled !== DEFAULT_SETTINGS.lrclibEnabled ||
    settings.dynamicIslandEnabled !== DEFAULT_SETTINGS.dynamicIslandEnabled;

  return (
    <section
      aria-label="Spotify Mini Settings"
      className="mini-window w-full max-w-[540px] rounded-[var(--radius-window)] overflow-hidden"
    >
      {/* Header */}
      <header className="flex items-center justify-between gap-3 px-6 py-4 border-b border-[var(--border-hairline)]">
        <div className="flex items-center gap-2.5 min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to previous view"
              className="w-8 h-8 rounded-[9px] inline-flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--surface-interactive)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              <ArrowLeft size={16} />
            </button>
          )}
          <div>
            <h2 className="font-display text-[16px] font-semibold tracking-[-0.015em] text-[var(--text-primary)]">
              Preferences
            </h2>
            <p className="text-[12.5px] text-[var(--text-secondary)]">
              Customize appearance, lyrics legibility, and floating behavior
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onResetSettings}
          disabled={!isModified}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] text-[12px] font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-interactive)] hover:text-[var(--text-primary)] transition-colors cursor-pointer disabled:opacity-35 disabled:pointer-events-none whitespace-nowrap shrink-0"
        >
          <RotateCcw size={13} />
          Reset
        </button>
      </header>

      <div className="p-6 space-y-7">
        {/* 1. Theme Selection */}
        <div>
          <div className="mb-3">
            <h3 className="font-display text-[13.5px] font-semibold text-[var(--text-primary)]">
              Theme
            </h3>
            <p className="text-[12.5px] text-[var(--text-secondary)] mt-0.5">
              Applies consistently across popup, floating player, and lyrics surfaces
            </p>
          </div>

          <div
            role="radiogroup"
            aria-label="Theme selection"
            className="grid grid-cols-2 sm:grid-cols-4 gap-2.5"
          >
            {THEME_OPTIONS.map((item) => {
              const selected = settings.theme === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onUpdateSettings({ theme: item.id })}
                  className={`group text-left rounded-[12px] p-2.5 border transition-[border-color,background-color,transform] duration-150 cursor-pointer active:scale-[0.98] ${
                    selected
                      ? 'border-[var(--accent-primary)] bg-[var(--accent-muted)]/60'
                      : 'border-[var(--border-hairline)] bg-[var(--surface-interactive)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  {/* Miniature surface preview */}
                  <div
                    className="h-11 rounded-[8px] p-2 flex flex-col justify-between border border-black/15 overflow-hidden relative"
                    style={{ backgroundColor: item.bg }}
                  >
                    <div
                      className="h-3.5 w-3/4 rounded-[4px]"
                      style={{ backgroundColor: item.surface }}
                    />
                    <div className="flex items-center justify-between">
                      <span
                        className="h-1.5 w-8 rounded-full"
                        style={{ backgroundColor: '#1db954' }}
                      />
                      {selected && (
                        <span className="w-4 h-4 rounded-full bg-[var(--accent-primary)] text-[var(--accent-contrast)] inline-flex items-center justify-center">
                          <Check size={10} strokeWidth={3} />
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="text-[12.5px] font-semibold text-[var(--text-primary)] leading-tight">
                      {item.name}
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      {item.caption}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Lyrics Font Size */}
        <div className="pt-5 border-t border-[var(--border-hairline)]">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div>
              <h3 className="font-display text-[13.5px] font-semibold text-[var(--text-primary)]">
                Lyrics Font Size
              </h3>
              <p className="text-[12.5px] text-[var(--text-secondary)] mt-0.5">
                Adjust reading scale for floating lyrics windows
              </p>
            </div>
            <SegmentedControl<LyricsFontSize>
              ariaLabel="Lyrics font size"
              value={settings.lyricsFontSize}
              onChange={(lyricsFontSize) => onUpdateSettings({ lyricsFontSize })}
              size="sm"
              options={[
                { value: 'sm', label: 'Small' },
                { value: 'md', label: 'Medium' },
                { value: 'lg', label: 'Large' },
              ]}
            />
          </div>

          {/* Live Typography Sample */}
          <div className="rounded-[12px] bg-[var(--surface-interactive)] border border-[var(--border-hairline)] px-4 py-3.5 space-y-1.5">
            <p
              className={`font-display font-semibold text-[var(--text-primary)] leading-snug transition-[font-size] duration-150 ${PREVIEW_FONT_CLASS[settings.lyricsFontSize]}`}
            >
              Midnight holding steady in the silver rain
            </p>
            <p className="text-[13px] text-[var(--text-muted)]">
              Every station glows and fades behind the glass
            </p>
          </div>
        </div>

        {/* 3. Behavior & Density Toggles */}
        <div className="pt-3 border-t border-[var(--border-hairline)] divide-y divide-[var(--border-hairline)]">
          <ToggleSwitch
            id="setting-compact-mode"
            checked={settings.compactMode}
            onChange={(compactMode) => onUpdateSettings({ compactMode })}
            label="Compact Mode"
            description="Reduce padding and window footprint across popup and floating layouts."
          />

          <ToggleSwitch
            id="setting-auto-open"
            checked={settings.autoOpenFloating}
            onChange={(autoOpenFloating) => onUpdateSettings({ autoOpenFloating })}
            label="Automatically Open Floating Player"
            description="Launch the floating mini player automatically when Spotify Web begins playback (requires active page gesture in Chrome)."
          />

          <ToggleSwitch
            id="setting-lrclib-fallback"
            checked={settings.lrclibEnabled}
            onChange={(lrclibEnabled) => onUpdateSettings({ lrclibEnabled })}
            label="LRCLIB Lyrics Fallback"
            description="Fetch timestamped lyrics from LRCLIB when Spotify's lyrics panel isn't open."
          />

          <ToggleSwitch
            id="setting-dynamic-island"
            checked={settings.dynamicIslandEnabled}
            onChange={(dynamicIslandEnabled) =>
              onUpdateSettings({ dynamicIslandEnabled })
            }
            label="Frameless Dynamic Island"
            description="Float a macOS-style Dynamic Island pill at the top of Chrome tabs with zero address bar."
          />
        </div>

        {/* 4. Default Display Mode */}
        <div className="pt-5 border-t border-[var(--border-hairline)]">
          <div className="mb-3">
            <h3 className="font-display text-[13.5px] font-semibold text-[var(--text-primary)]">
              Default Display Mode
            </h3>
            <p className="text-[12.5px] text-[var(--text-secondary)] mt-0.5">
              Choose which floating interface opens when launching from the extension popup
            </p>
          </div>

          <div
            role="radiogroup"
            aria-label="Default floating display mode"
            className="grid grid-cols-1 sm:grid-cols-2 gap-2"
          >
            {DISPLAY_MODE_OPTIONS.map((option) => {
              const selected = settings.defaultDisplayMode === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onUpdateSettings({ defaultDisplayMode: option.value })}
                  className={`text-left rounded-[11px] px-3.5 py-2.5 border transition-[border-color,background-color] duration-150 cursor-pointer ${
                    selected
                      ? 'border-[var(--accent-primary)] bg-[var(--accent-muted)]/60'
                      : 'border-[var(--border-hairline)] bg-[var(--surface-interactive)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-medium text-[var(--text-primary)]">
                      {option.label}
                    </span>
                    {selected && (
                      <Check size={14} className="text-[var(--accent-primary)] shrink-0" />
                    )}
                  </div>
                  <p className="text-[11.5px] text-[var(--text-secondary)] mt-0.5 leading-snug">
                    {option.detail}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
