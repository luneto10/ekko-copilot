import { motion } from 'framer-motion';
import Markdown from 'react-markdown';
import { bridge } from '@/shared/bridge';
import { useCopilot } from './useCopilot';

/**
 * Wolf Tactic panel — the real-time coaching nudge (the exact line to say).
 *
 * The grounded Q&A moved into the Conversation panel's chat, so this surface is
 * now just the latest tactic, plus a small button to force a fresh one
 * (compile memory + generate) on demand.
 */
export function CopilotRecommendations() {
  const { tactic } = useCopilot();

  const generate = () => {
    bridge.forceMemoryCompile();
    bridge.forceTactic();
  };

  if (!tactic) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-2xl border border-white/10 px-4 py-2 text-xs italic text-slate-500">
        <span className="flex items-center gap-2">
          <span aria-hidden="true">🐺</span>
          Wolf Tactics appear here while you’re listening.
        </span>
        <GenerateButton onClick={generate} />
      </div>
    );
  }

  return (
    <motion.div
      key={tactic.ts}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-surface relative overflow-hidden rounded-2xl border border-amber-400/40 px-4 py-3 text-amber-100"
    >
      {/* Amber tint layered over the (solid or glass) surface so the box stays
          opaque in solid mode instead of letting the desktop show through. */}
      <span className="pointer-events-none absolute inset-0 bg-amber-400/10" aria-hidden="true" />
      <div className="relative">
        <div className="mb-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-300">
            <span aria-hidden="true">🐺</span> Wolf Tactic
          </div>
          <GenerateButton onClick={generate} />
        </div>
        <div className="tactic-md text-sm leading-snug">
          <Markdown>{tactic.text}</Markdown>
        </div>
      </div>
    </motion.div>
  );
}

/** Tiny lightning button to force a fresh tactic (compile memory + generate). */
function GenerateButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Generate a fresh Wolf Tactic"
      aria-label="Generate a fresh Wolf Tactic"
      className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-amber-400/30 text-amber-300/80 transition hover:bg-amber-400/15 hover:text-amber-100"
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10" />
      </svg>
    </button>
  );
}


