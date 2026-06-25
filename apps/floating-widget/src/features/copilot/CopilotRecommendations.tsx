import { motion } from 'framer-motion';
import Markdown from 'react-markdown';
import { useCopilot } from './useCopilot';

/**
 * Wolf Tactic panel — the real-time coaching nudge (the exact line to say).
 *
 * The grounded Q&A moved into the Conversation panel's chat, so this surface is
 * now just the latest tactic. The main process only pushes new tactics while
 * the rep is listening, so it stops popping once the call ends.
 */
export function CopilotRecommendations() {
  const { tactic } = useCopilot();

  if (!tactic) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-2 text-xs italic text-slate-500">
        <span aria-hidden="true">🐺</span>
        Wolf Tactics appear here while you’re listening.
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
        <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-300">
          <span aria-hidden="true">🐺</span> Wolf Tactic
        </div>
        <div className="tactic-md text-sm leading-snug">
          <Markdown>{tactic.text}</Markdown>
        </div>
      </div>
    </motion.div>
  );
}

