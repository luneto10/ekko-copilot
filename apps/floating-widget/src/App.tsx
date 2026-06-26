import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAudioCapture } from '@/features/capture/useAudioCapture';
import { AppearanceMenu } from '@/shared/ui/AppearanceMenu';
import { CollapsedDock } from '@/shared/ui/CollapsedDock';
import { useAppearance } from '@/shared/useAppearance';
import { bridge } from '@/shared/bridge';
import { DRAG_REGION, NO_DRAG_REGION } from '@/shared/electron';
import { PANELS } from '@/panels/registry';

const GENIE_HIDDEN = { opacity: 0, scaleX: 0.04, scaleY: 0.16, x: 90 };
const GENIE_SHOWN = { opacity: 1, scaleX: 1, scaleY: 1, x: 0 };
const GENIE_ORIGIN: CSSProperties = { transformOrigin: 'right center' };

// App owns the window shell; feature content stays behind the panel registry.
export default function App() {
  const { isListening, error, start, stop } = useAudioCapture();
  const { theme, surface, setTheme, setSurface, rootClass } = useAppearance();
  const [collapsed, setCollapsed] = useState(false);
  const [docked, setDocked] = useState(false);

  const toggleListening = isListening ? stop : start;

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

  const resetSize = () => {
    setDocked(false);
    setCollapsed(false);
    bridge.resetWindow();
  };

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
      <motion.div
        initial={false}
        animate={collapsed ? GENIE_HIDDEN : GENIE_SHOWN}
        transition={{ duration: 0.32, ease: [0.45, 0, 0.55, 1] }}
        onAnimationComplete={onFullAnimationComplete}
        style={{ ...GENIE_ORIGIN, pointerEvents: collapsed ? 'none' : 'auto' }}
        className="absolute inset-0 flex h-full flex-col gap-3 p-3 text-slate-100"
      >
        <header
          style={DRAG_REGION}
          className="glass-surface relative z-50 flex items-center justify-between rounded-xl border border-white/10 px-4 py-2 shadow-[0_18px_50px_rgba(2,6,23,0.28)]"
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              style={NO_DRAG_REGION}
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
              <div className="text-sm font-semibold tracking-wide">WorkIQ Sales Copilot</div>
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-slate-400">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${isListening ? 'bg-emerald-400' : 'bg-slate-500'}`}
                />
                {isListening ? 'Live' : 'Ready'}
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
              style={NO_DRAG_REGION}
              onClick={toggleListening}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold text-white transition ${
                isListening ? 'bg-rose-500/85 hover:bg-rose-500' : 'bg-sky-500/85 hover:bg-sky-500'
              }`}
            >
              {isListening ? 'Stop' : 'Listen'}
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
