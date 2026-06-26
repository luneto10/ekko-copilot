import { useCallback, useEffect, useRef, useState } from 'react';
import { bridge } from '@/shared/bridge';
import type { ChatMessage, KeyNote } from './types';
import { suggestionsFor, topicLabel } from './mockChat';
import { chatBackend } from './chatBackend';

let msgSeq = 0;
const nextMsgId = () => `m${(msgSeq += 1)}`;

/** Group key notes by topic so repeated questions reuse the same pill. */
const noteKey = (topic: string | undefined, query: string) =>
  (topic?.trim() || query.trim()).toLowerCase();

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
  // "Show where it is" cue: scroll-to + pulse an existing pill WITHOUT opening
  // it, so a repeated question points the rep to the answer they already have.
  const [flash, setFlash] = useState<{ id: string; nonce: number } | null>(null);

  // Let the event/async callbacks read the latest state without re-subscribing.
  const notesRef = useRef<KeyNote[]>([]);
  notesRef.current = notes;
  const selectedRef = useRef<string | null>(null);
  selectedRef.current = selectedId;
  const flashSeq = useRef(0);

  useEffect(() => {
    // Pulse an existing pill to show where its answer is, without opening it.
    const showWhere = (id: string) => setFlash({ id, nonce: (flashSeq.current += 1) });
    // Open a note only when nothing is selected, so we never hijack the rep.
    const selectIfNone = (id: string) => {
      if (!selectedRef.current) setSelectedId(id);
    };
    const unsubscribers = [
      // A question was detected — surface its pill (without stealing focus).
      bridge.onWorkIqStatus((status) => {
        if (!status.isSearching) return;
        const key = noteKey(status.topic, status.query);
        const exists = notesRef.current.some((n) => n.id === key);
        setNotes((prev) => {
          if (prev.some((n) => n.id === key)) {
            // Already tracking this topic — don't duplicate, just refresh its query.
            return prev.map((n) => (n.id === key ? { ...n, query: status.query } : n));
          }
          const note: KeyNote = {
            id: key,
            topic: topicLabel(status.topic, status.query),
            query: status.query,
            status: 'searching',
            sources: [],
            messages: [],
            suggestions: [],
          };
          return [...prev, note];
        });
        // Open a brand-new note only if nothing is open; for a repeat, just
        // flash where the existing answer already lives.
        if (!exists) selectIfNone(key);
        showWhere(key);
      }),

      // The grounded answer arrived — seed/refresh the note's chat with it.
      bridge.onWorkIqResult((result) => {
        const key = noteKey(result.topic, result.query);
        const exists = notesRef.current.some((n) => n.id === key);
        setNotes((prev) => {
          const seed: ChatMessage = {
            id: nextMsgId(),
            role: 'assistant',
            text: result.answer,
            sources: result.sources,
          };
          const apply = (n: KeyNote): KeyNote => ({
            ...n,
            topic: topicLabel(result.topic, result.query),
            query: result.query,
            status: 'ready',
            sources: result.sources,
            // Refresh the grounded answer (first message); keep any follow-up chat.
            messages:
              n.messages.length === 0
                ? [seed]
                : [
                    { ...n.messages[0], text: result.answer, sources: result.sources, pending: false },
                    ...n.messages.slice(1),
                  ],
            suggestions: suggestionsFor(result.topic),
          });
          if (prev.some((n) => n.id === key)) {
            return prev.map((n) => (n.id === key ? apply(n) : n));
          }
          return [
            ...prev,
            apply({
              id: key,
              topic: '',
              query: result.query,
              status: 'ready',
              sources: [],
              messages: [],
              suggestions: [],
            }),
          ];
        });
        // Grounding arrived: open it only if nothing else is open; if it's a
        // repeat the rep isn't currently viewing, just flash where it is.
        if (!exists) selectIfNone(key);
        else if (selectedRef.current !== key) showWhere(key);
      }),
    ];

    return () => unsubscribers.forEach((off) => off());
  }, []);

  const selectNote = useCallback((id: string) => setSelectedId(id), []);

  /** Drop a key note the rep no longer needs; select the NEXT one if it was active. */
  const removeNote = useCallback((id: string) => {
    const current = notesRef.current;
    const index = current.findIndex((n) => n.id === id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
    setSelectedId((selected) => {
      if (selected !== id) return selected;
      const remaining = current.filter((n) => n.id !== id);
      if (remaining.length === 0) return null;
      // The deleted slot's index now holds the next note; clamp when last was removed.
      return remaining[Math.min(index, remaining.length - 1)].id;
    });
  }, []);

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
  return { notes, selected, selectedId, selectNote, ask, removeNote, flash };
}
