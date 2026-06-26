import type { WorkIqSource } from '@workiq/types';
import type { KeyNote } from './types';
import { mockFollowUp } from './mockChat';
import { bridge } from '@/shared/bridge';

export interface ChatAnswer {
  answer: string;
  sources: WorkIqSource[];
}

export interface ChatBackend {
  ask(question: string, note: KeyNote): Promise<ChatAnswer>;
}

export const chatBackend: ChatBackend = {
  ask: async (question, note) => {
    try {
      const result = await bridge.askChat(question, note.topic);
      if (result && result.answer) return { answer: result.answer, sources: result.sources ?? [] };
    } catch {
    }
    return mockFollowUp(question, note);
  },
};
