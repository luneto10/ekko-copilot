import { useEffect, useState } from 'react';

/** Colour palette of the widget. */
export type ThemeMode = 'dark' | 'light';
/** Whether panels are see-through ("glass") or fully opaque. */
export type SurfaceMode = 'transparent' | 'solid';

const THEME_KEY = 'workiq:theme';
const SURFACE_KEY = 'workiq:surface';

function read<T extends string>(key: string, fallback: T, valid: readonly T[]): T {
  const stored = localStorage.getItem(key);
  return stored && (valid as readonly string[]).includes(stored) ? (stored as T) : fallback;
}

/**
 * Persisted appearance preferences (theme + surface).
 *
 * Returns the current values, setters, and the root class string to apply so
 * the CSS variables in `globals.css` re-skin every `.glass-surface` at once.
 */
export function useAppearance() {
  const [theme, setTheme] = useState<ThemeMode>(() =>
    read(THEME_KEY, 'dark', ['dark', 'light']),
  );
  const [surface, setSurface] = useState<SurfaceMode>(() =>
    read(SURFACE_KEY, 'transparent', ['transparent', 'solid']),
  );

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);
  useEffect(() => {
    localStorage.setItem(SURFACE_KEY, surface);
  }, [surface]);

  return {
    theme,
    surface,
    setTheme,
    setSurface,
    rootClass: `theme-${theme} surface-${surface}`,
  };
}
