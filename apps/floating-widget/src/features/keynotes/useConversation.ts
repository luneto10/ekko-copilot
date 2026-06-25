import { useCallback, useEffect, useRef, useState } from 'react';
import { bridge } from '@/shared/bridge';
import type { ChatMessage, KeyNote } from './types';
import { suggestionsFor, topicLabel } from './mockChat';
import { chatBackend } from './chatBackend';

let msgSeq = 0;
const nextMsgId = () => `m${(msgSeq += 1)}`;

/**
 * Owns the conversation state: the list of key notes (built live from Work IQ
 * lookups), which one is selected, and each note's own persisted chat.
 *
 * Work IQ grounds the *initial* answer for every detected question in the main
 * process; follow-up questions inside a note's chat are mocked locally so the
 * experience stays fast.
 */
export function useConversation() {
  const [notes, setNotes] = useState<KeyNote[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Refs let the event/async callbacks read the latest values without
  // re-subscribing on every render.
  const selectedRef = useRef<string | null>(null);
  selectedRef.current = selectedId;
  const notesRef = useRef<KeyNote[]>([]);
  notesRef.current = notes;

  useEffect(() => {
    const selectIfNone = (id: string) => {
      if (selectedRef.current === null) setSelectedId(id);
    };

    const unsubscribers = [
      // A question was detected — show a "searching" pill immediately.
      bridge.onWorkIqStatus((status) => {
        if (!status.isSearching) return;
        setNotes((prev) => {
          if (prev.some((n) => n.id === status.query)) return prev;
          const note: KeyNote = {
            id: status.query,
            topic: topicLabel(status.topic, status.query),
            query: status.query,
            status: 'searching',
            sources: [],
            messages: [],
            suggestions: [],
          };
          return [...prev, note];
        });
        selectIfNone(status.query);
      }),

      // The grounded answer arrived — seed the note's chat with it.
      bridge.onWorkIqResult((result) => {
        setNotes((prev) => {
          const seed: ChatMessage = {
            id: nextMsgId(),
            role: 'assistant',
            text: result.answer,
            sources: result.sources,
          };
          const fill = (n: KeyNote): KeyNote => ({
            ...n,
            topic: topicLabel(result.topic, result.query),
            status: 'ready',
            sources: result.sources,
            messages: n.messages.length === 0 ? [seed] : n.messages,
            suggestions: suggestionsFor(result.topic),
          });
          if (prev.some((n) => n.id === result.query)) {
            return prev.map((n) => (n.id === result.query ? fill(n) : n));
          }
          return [
            ...prev,
            fill({
              id: result.query,
              topic: '',
              query: result.query,
              status: 'ready',
              sources: [],
              messages: [],
              suggestions: [],
            }),
          ];
        });
        selectIfNone(result.query);
      }),
    ];

    return () => unsubscribers.forEach((off) => off());
  }, []);

  const selectNote = useCallback((id: string) => setSelectedId(id), []);

  /** Ask a follow-up question within a note's chat (mocked Work IQ search). */
  const ask = useCallback(async (id: string, text: string) => {
    const question = text.trim();
    if (!question) return;
    const target = notesRef.current.find((n) => n.id === id);
    if (!target) return;

    const userMsg: ChatMessage = { id: nextMsgId(), role: 'user', text: question };
    const pendingId = nextMsgId();
    const pendingMsg: ChatMessage = { id: pendingId, role: 'assistant', text: '', pending: true };
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, messages: [...n.messages, userMsg, pendingMsg] } : n,
      ),
    );

    const { answer, sources } = await chatBackend.ask(question, target);
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id
          ? {
              ...n,
              messages: n.messages.map((m) =>
                m.id === pendingId ? { ...m, text: answer, sources, pending: false } : m,
              ),
            }
          : n,
      ),
    );
  }, []);

  const selected = notes.find((n) => n.id === selectedId) ?? null;
  return { notes, selected, selectedId, selectNote, ask };
}
