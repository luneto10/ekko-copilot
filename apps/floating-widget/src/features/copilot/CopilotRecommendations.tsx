import { motion } from 'framer-motion';
import Markdown from 'react-markdown';
import { bridge } from '@/shared/bridge';
import { useCopilot } from './useCopilot';

// Shows the latest coachable line only; grounded Q&A lives in the Conversation panel.
export function CopilotRecommendations() {
  const { tactic } = useCopilot();

  const generate = () => {
    bridge.forceMemoryCompile();
    bridge.forceTactic();
  };

  if (!tactic) {
    return (
      <div className="glass-surface flex items-center justify-between gap-2 rounded-xl border border-white/10 px-4 py-2 text-xs text-slate-400">
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-300/80" />
          Next move appears while listening.
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
      className="glass-surface relative overflow-hidden rounded-xl border border-emerald-300/30 px-4 py-3 text-slate-100 shadow-[0_18px_44px_rgba(2,6,23,0.22)]"
    >
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-emerald-400/12 via-cyan-300/8 to-transparent" aria-hidden="true" />
      <div className="relative">
        <div className="mb-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
            Next Move
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

function GenerateButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Refresh next move"
      aria-label="Refresh next move"
      className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-emerald-300/30 text-emerald-200/80 transition hover:bg-emerald-300/15 hover:text-emerald-100"
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10" />
      </svg>
    </button>
  );
}


