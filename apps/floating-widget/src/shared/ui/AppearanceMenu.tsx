import { useEffect, useRef, useState } from 'react';
import { NO_DRAG_REGION } from '@/shared/electron';
import type { SurfaceMode, ThemeMode } from '@/shared/useAppearance';

interface AppearanceMenuProps {
  theme: ThemeMode;
  surface: SurfaceMode;
  onThemeChange: (theme: ThemeMode) => void;
  onSurfaceChange: (surface: SurfaceMode) => void;
}

interface Option<T extends string> {
  value: T;
  label: string;
}

const THEME_OPTIONS: Option<ThemeMode>[] = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
];

const SURFACE_OPTIONS: Option<SurfaceMode>[] = [
  { value: 'transparent', label: 'Transparent' },
  { value: 'solid', label: 'Solid' },
];

function Segmented<T extends string>({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div>
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
        {legend}
      </div>
      <div className="flex gap-1">
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              aria-pressed={active}
              className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition ${
                active
                  ? 'border-sky-400/60 bg-sky-500/20 text-slate-100'
                  : 'border-white/10 text-slate-300 hover:bg-white/10'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function AppearanceMenu({
  theme,
  surface,
  onThemeChange,
  onSurfaceChange,
}: AppearanceMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div ref={containerRef} className="relative" style={NO_DRAG_REGION}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Appearance"
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-slate-200 transition hover:bg-white/10"
      >
        <SettingsIcon />
      </button>

      {open && (
        <>
          <div
            style={NO_DRAG_REGION}
            className="fixed inset-0 z-40"
            onPointerDown={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-label="Appearance settings"
            className="glass-surface absolute right-0 top-full z-50 mt-2 w-56 space-y-3 rounded-2xl border border-white/10 p-3 shadow-2xl"
          >
            <Segmented
              legend="Theme"
              options={THEME_OPTIONS}
              value={theme}
              onChange={onThemeChange}
            />
            <Segmented
              legend="Background"
              options={SURFACE_OPTIONS}
              value={surface}
              onChange={onSurfaceChange}
            />
          </div>
        </>
      )}
    </div>
  );
}

function SettingsIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6V20a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-.6 1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1H4a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 .6-1 1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6V4a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 .6 1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 .6 1H20a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-.51 1Z" />
    </svg>
  );
}
