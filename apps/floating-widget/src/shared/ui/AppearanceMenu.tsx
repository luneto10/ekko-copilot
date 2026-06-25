import type { CSSProperties } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { SurfaceMode, ThemeMode } from '@/shared/useAppearance';

/** Keep the popup out of Electron's window-drag region. */
const NO_DRAG: CSSProperties = { WebkitAppRegion: 'no-drag' };

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

/** A labelled row of mutually-exclusive choices (a small segmented control). */
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

/**
 * Appearance picker — a gear button that opens a small popup to choose the
 * theme (dark/light) and surface (transparent/solid). Closes on outside click
 * or Escape.
 */
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
    <div ref={containerRef} className="relative" style={NO_DRAG}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Appearance"
        aria-haspopup="dialog"
        aria-expanded={open}
        className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
      >
        ⚙️
      </button>

      {open && (
        <>
          {/* Full-screen catcher so clicking anywhere (even the header's
              window-drag region) closes the popup. */}
          <div
            style={NO_DRAG}
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
