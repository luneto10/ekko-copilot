import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAudioCapture } from '@/features/capture/useAudioCapture';
import { AppearanceMenu } from '@/shared/ui/AppearanceMenu';
import { CollapsedDock } from '@/shared/ui/CollapsedDock';
import { useAppearance } from '@/shared/useAppearance';
import { bridge } from '@/shared/bridge';
import { PANELS } from '@/panels/registry';

/** Electron frameless-window drag regions (see bridge.d.ts CSSProperties aug). */
const DRAG: CSSProperties = { WebkitAppRegion: 'drag' };
const NO_DRAG: CSSProperties = { WebkitAppRegion: 'no-drag' };

/**
 * "Genie" transforms: content squishes toward the right edge (where the dock
 * sits) as it gets sucked into the hole, and bursts back out from there. The
 * `transformOrigin: right center` makes everything converge on that point.
 */
const GENIE_HIDDEN = { opacity: 0, scaleX: 0.04, scaleY: 0.16, x: 90 };
const GENIE_SHOWN = { opacity: 1, scaleX: 1, scaleY: 1, x: 0 };
const GENIE_ORIGIN: CSSProperties = { transformOrigin: 'right center' };

/**
 * The widget's layout shell.
 *
 * Owns only the header (brand + capture control), then renders whatever the
 * panel registry lists, in order. Each panel is self-contained, so this file
 * stays tiny: change the *layout* here, change *which* panels show in
 * `src/panels/registry.ts`.
 */
export default function App() {
  const { isListening, error, start, stop } = useAudioCapture();
  const { theme, surface, setTheme, setSurface, rootClass } = useAppearance();
  const [collapsed, setCollapsed] = useState(false);
  // `docked` tracks when the Electron window has actually shrunk to the dock.
  // It lags `collapsed` so the full-view genie plays at full size first.
  const [docked, setDocked] = useState(false);

  const toggleListening = isListening ? stop : start;

  // The full view is never unmounted (so panel state — transcript, memory,
  // copilot — survives collapse). Collapsing just animates it out; the window
  // resize is deferred until that genie finishes, then the dock appears.
  const collapse = () => setCollapsed(true);
  const expand = () => {
    bridge.expandWindow();
    setDocked(false);
    setCollapsed(false);
  };
  const onFullAnimationComplete = () => {
    if (collapsed) {
      bridge.collapseWindow();
      setDocked(true);
    }
  };

  // Dev escape hatch: snap the renderer back to expanded and force the window
  // to its default size, in case a resize gets stuck.
  const resetSize = () => {
    setDocked(false);
    setCollapsed(false);
    bridge.resetWindow();
  };

  // Dev shortcuts:
  //   Ctrl/Cmd+M  toggle collapsed/expanded
  //   Ctrl/Cmd+0  reset the window to its default size (escape hatch)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        if (collapsed) expand();
        else collapse();
      } else if (e.key === '0') {
        e.preventDefault();
        resetSize();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [collapsed]);

  return (
    <div className={`relative h-screen w-screen overflow-hidden ${rootClass}`}>
      {/* Full view — always mounted; genies out to the right edge when collapsed. */}
      <motion.div
        initial={false}
        animate={collapsed ? GENIE_HIDDEN : GENIE_SHOWN}
        transition={{ duration: 0.32, ease: [0.45, 0, 0.55, 1] }}
        onAnimationComplete={onFullAnimationComplete}
        style={{ ...GENIE_ORIGIN, pointerEvents: collapsed ? 'none' : 'auto' }}
        className="absolute inset-0 flex h-full flex-col gap-3 p-3 text-slate-100"
      >
        <header
          style={DRAG}
          className="glass-surface relative z-50 flex items-center justify-between rounded-2xl border border-white/10 px-4 py-2"
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              style={NO_DRAG}
              onClick={collapse}
              title="Collapse to side dock"
              aria-label="Collapse to side dock"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-slate-200 transition hover:bg-white/10"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="9 6 15 12 9 18" />
              </svg>
            </button>
            <div className="leading-tight">
              <div className="text-sm font-semibold">WorkIQ Sales Copilot</div>
              <div className="text-[10px] uppercase tracking-widest text-slate-400">
                {isListening ? 'Listening' : 'Idle'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AppearanceMenu
              theme={theme}
              surface={surface}
              onThemeChange={setTheme}
              onSurfaceChange={setSurface}
            />
            <button
              type="button"
              style={NO_DRAG}
              onClick={toggleListening}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                isListening ? 'bg-rose-500/80 hover:bg-rose-500' : 'bg-sky-500/80 hover:bg-sky-500'
              }`}
            >
              {isListening ? 'Stop' : 'Start Listening'}
            </button>
          </div>
        </header>

        {error && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            {error}
          </div>
        )}

        {PANELS.map(({ id, Component, grow }) => (
          <section key={id} className={grow ? 'min-h-0 flex-1 overflow-hidden' : ''}>
            <Component />
          </section>
        ))}
      </motion.div>

      {/* Dock — appears once the window has shrunk; bursts out of the right edge. */}
      <motion.div
        initial={false}
        animate={docked ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.2 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        style={{ ...GENIE_ORIGIN, pointerEvents: docked ? 'auto' : 'none' }}
        className="absolute inset-0 z-[60]"
      >
        <CollapsedDock
          isListening={isListening}
          onToggle={toggleListening}
          onExpand={expand}
        />
      </motion.div>
    </div>
  );
}
