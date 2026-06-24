import type { CSSProperties } from 'react';
import { useAudioCapture } from '@/features/capture/useAudioCapture';
import { PANELS } from '@/panels/registry';

/** Electron frameless-window drag regions (see bridge.d.ts CSSProperties aug). */
const DRAG: CSSProperties = { WebkitAppRegion: 'drag' };
const NO_DRAG: CSSProperties = { WebkitAppRegion: 'no-drag' };

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

  return (
    <div className="flex h-screen flex-col gap-3 p-3 text-slate-100">
      <header
        style={DRAG}
        className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-2 backdrop-blur-xl"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🐺</span>
          <div className="leading-tight">
            <div className="text-sm font-semibold">WorkIQ Sales Copilot</div>
            <div className="text-[10px] uppercase tracking-widest text-slate-400">
              {isListening ? 'Listening' : 'Idle'}
            </div>
          </div>
        </div>
        <button
          type="button"
          style={NO_DRAG}
          onClick={isListening ? stop : start}
          className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
            isListening ? 'bg-rose-500/80 hover:bg-rose-500' : 'bg-sky-500/80 hover:bg-sky-500'
          }`}
        >
          {isListening ? 'Stop' : 'Start Listening'}
        </button>
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
    </div>
  );
}
