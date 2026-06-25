import type { WorkIqSource } from '@workiq/types';
import type { KeyNote } from './types';
import { mockFollowUp } from './mockChat';

/** A grounded answer to a follow-up question inside a key note's chat. */
export interface ChatAnswer {
  answer: string;
  sources: WorkIqSource[];
}

/**
 * The seam for the per-note chatbot.
 *
 * `useConversation` depends ONLY on this interface, so swapping the mock for a
 * real backend (Azure OpenAI + Work IQ) is a one-line change here — e.g. point
 * `chatBackend` at an implementation that calls the main process over IPC
 * (`bridge.askChat(...)`). Nothing in the UI has to change.
 */
export interface ChatBackend {
  ask(question: string, note: KeyNote): Promise<ChatAnswer>;
}

/** Default backend: the fast renderer-side mock. Swap this to go live. */
export const chatBackend: ChatBackend = {
  ask: (question, note) => mockFollowUp(question, note),
};
