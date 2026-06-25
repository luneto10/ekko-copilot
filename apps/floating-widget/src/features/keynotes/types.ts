import type { WorkIqSource } from '@workiq/types';

/** A single chat turn within a key note's conversation. */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  /** Grounding files attached to an assistant answer. */
  sources?: WorkIqSource[];
  /** True while the answer is still being searched for. */
  pending?: boolean;
}

/**
 * A "key note" — a question raised during the conversation that Work IQ has
 * already grounded against the user's files. Each note carries its own chat so
 * the rep can dig deeper without losing the others.
 */
export interface KeyNote {
  /** Stable id (derived from the originating query). */
  id: string;
  /** Short label shown on the pill (e.g. "Pricing"). */
  topic: string;
  /** The original question that raised this note. */
  query: string;
  /** `searching` while Work IQ grounds it, then `ready`. */
  status: 'searching' | 'ready';
  /** Files Work IQ found for this note, reused when answering follow-ups. */
  sources: WorkIqSource[];
  /** Per-note chat history (seeded with the grounded answer). */
  messages: ChatMessage[];
  /** Suggested follow-up questions to nudge the rep. */
  suggestions: string[];
}
