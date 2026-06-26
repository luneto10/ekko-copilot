import type { WorkIqSource } from '@workiq/types';
import type { KeyNote } from './types';
import { mockFollowUp } from './mockChat';
import { bridge } from '@/shared/bridge';

/** A grounded answer to a follow-up question inside a key note's chat. */
export interface ChatAnswer {
  answer: string;
  sources: WorkIqSource[];
}

/**
 * The seam for the per-note chatbot.
 *
 * Default: route follow-ups through the main process (`bridge.askChat`), which
 * grounds them with the SAME Work IQ client as the key notes — real Copilot
 * Retrieval / Graph Search when `WORKIQ_MODE=graph`, or the mock otherwise. If
 * the bridge isn't available (e.g. old preload), fall back to the local mock.
 */
export interface ChatBackend {
  ask(question: string, note: KeyNote): Promise<ChatAnswer>;
}

export const chatBackend: ChatBackend = {
  ask: async (question, note) => {
    try {
      const result = await bridge.askChat(question, note.topic);
      // If the backend returned nothing useful, fall back to the mock.
      if (result && result.answer) return { answer: result.answer, sources: result.sources ?? [] };
    } catch {
      // bridge.askChat unavailable — fall through to the mock.
    }
    return mockFollowUp(question, note);
  },
};
