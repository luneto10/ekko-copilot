import type { WorkIqResponse, WorkIqSource } from '@workiq/types';
import { suggestionsFor, topicLabel } from './mockChat';
import type { ChatMessage, KeyNote } from './types';

let messageSeq = 0;

export const nextMessageId = () => `m${(messageSeq += 1)}`;

export const noteKey = (topic: string | undefined, query: string) =>
  (topic?.trim() || query.trim()).toLowerCase();

export const createEmptyNote = (
  id: string,
  topic: string | undefined,
  query: string,
): KeyNote => ({
  id,
  topic: topicLabel(topic, query),
  query,
  status: 'searching',
  sources: [],
  messages: [],
  suggestions: [],
});

export const createAssistantMessage = (result: WorkIqResponse): ChatMessage => ({
  id: nextMessageId(),
  role: 'assistant',
  text: result.answer,
  sources: result.sources,
});

export const createUserMessage = (text: string): ChatMessage => ({
  id: nextMessageId(),
  role: 'user',
  text,
});

export const createPendingMessage = (): ChatMessage => ({
  id: nextMessageId(),
  role: 'assistant',
  text: '',
  pending: true,
});

export function applyGroundedAnswer(
  note: KeyNote,
  result: WorkIqResponse,
  seed: ChatMessage,
): KeyNote {
  const firstMessage = note.messages[0];
  const messages = firstMessage
    ? [
        { ...firstMessage, text: result.answer, sources: result.sources, pending: false },
        ...note.messages.slice(1),
      ]
    : [seed];

  return {
    ...note,
    topic: topicLabel(result.topic, result.query),
    query: result.query,
    status: 'ready',
    sources: result.sources,
    messages,
    suggestions: suggestionsFor(result.topic),
  };
}

export function appendMessages(note: KeyNote, messages: ChatMessage[]): KeyNote {
  return { ...note, messages: [...note.messages, ...messages] };
}

export function settlePendingMessage(
  note: KeyNote,
  pendingId: string,
  answer: string,
  sources: WorkIqSource[],
): KeyNote {
  return {
    ...note,
    messages: note.messages.map((message) =>
      message.id === pendingId
        ? { ...message, text: answer, sources, pending: false }
        : message,
    ),
  };
}