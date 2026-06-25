import { AnimatePresence, motion } from 'framer-motion';
import Markdown from 'react-markdown';
import { SOURCE_ICON } from '@/shared/theme';
import { useCopilot } from './useCopilot';

/**
 * Copilot · Work IQ panel — the "act now" surface.
 *
 * Shows (top to bottom): the latest Wolf Tactic (the exact line to say, in
 * bold), then a glowing box that is either an animated "Searching Work IQ…"
 * badge, the grounded answer + source chips, or an idle hint.
 *
 * Self-contained: pulls state from `useCopilot`.
 */
export function CopilotRecommendations() {
  const { searching, workIq, tactic } = useCopilot();

  return (
    <div className="space-y-2">
      {tactic && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-amber-100"
        >
          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-300">
            <span>🐺</span> Wolf Tactic
          </div>
          <div className="tactic-md text-sm leading-snug">
            <Markdown>{tactic.text}</Markdown>
          </div>
        </motion.div>
      )}

      <div
        className={`glass-surface rounded-2xl border border-sky-400/30 px-4 py-3 ${
          searching ? 'animate-pulse-glow' : ''
        }`}
      >
        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-sky-300">
          Copilot · Work IQ
        </h2>

        <AnimatePresence mode="wait">
          {searching ? (
            <motion.div
              key="searching"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-sm text-sky-200"
            >
              <span className="inline-flex h-2.5 w-2.5 animate-ping rounded-full bg-sky-400" />
              Searching Work IQ for “{searching}”…
            </motion.div>
          ) : workIq ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2 text-sm"
            >
              <p className="text-slate-100">{workIq.answer}</p>
              <div className="flex flex-wrap gap-1.5">
                {workIq.sources.map((source) => (
                  <span
                    key={source.url}
                    title={source.url}
                    className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-300"
                  >
                    {SOURCE_ICON[source.kind]} {source.title}
                  </span>
                ))}
              </div>
            </motion.div>
          ) : (
            <p className="text-xs italic text-slate-500">
              Grounded answers appear here when the customer asks about pricing, security, SLAs…
            </p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
