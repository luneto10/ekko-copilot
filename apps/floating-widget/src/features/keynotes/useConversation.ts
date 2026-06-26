import { useCallback, useEffect, useRef, useState } from 'react';
import { bridge } from '@/shared/bridge';
import type { KeyNote } from './types';
import { chatBackend } from './chatBackend';
import {
  appendMessages,
  applyGroundedAnswer,
  createAssistantMessage,
  createEmptyNote,
  createPendingMessage,
  createUserMessage,
  noteKey,
  settlePendingMessage,
} from './conversationState';

export function useConversation() {
  const [notes, setNotes] = useState<KeyNote[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ id: string; nonce: number } | null>(null);

  // Bridge callbacks need the latest note state without resubscribing every render.
  const notesRef = useRef<KeyNote[]>([]);
  notesRef.current = notes;
  const selectedRef = useRef<string | null>(null);
  selectedRef.current = selectedId;
  const flashSeq = useRef(0);

  useEffect(() => {
    const showWhere = (id: string) => setFlash({ id, nonce: (flashSeq.current += 1) });
    const selectIfNone = (id: string) => {
      if (!selectedRef.current) setSelectedId(id);
    };
    const unsubscribers = [
      bridge.onWorkIqStatus((status) => {
        if (!status.isSearching) return;
        const key = noteKey(status.topic, status.query);
        const exists = notesRef.current.some((n) => n.id === key);
        setNotes((prev) => {
          if (prev.some((n) => n.id === key)) {
            return prev.map((n) => (n.id === key ? { ...n, query: status.query } : n));
          }
          return [...prev, createEmptyNote(key, status.topic, status.query)];
        });
        if (!exists) selectIfNone(key);
        showWhere(key);
      }),

      bridge.onWorkIqResult((result) => {
        const key = noteKey(result.topic, result.query);
        const exists = notesRef.current.some((n) => n.id === key);
        setNotes((prev) => {
          const seed = createAssistantMessage(result);
          const apply = (n: KeyNote): KeyNote => applyGroundedAnswer(n, result, seed);
          if (prev.some((n) => n.id === key)) {
            return prev.map((n) => (n.id === key ? apply(n) : n));
          }
          return [...prev, apply(createEmptyNote(key, result.topic, result.query))];
        });
        if (!exists) selectIfNone(key);
        else if (selectedRef.current !== key) showWhere(key);
      }),
    ];

    return () => unsubscribers.forEach((off) => off());
  }, []);

  const selectNote = useCallback((id: string) => setSelectedId(id), []);

  const removeNote = useCallback((id: string) => {
    const current = notesRef.current;
    const index = current.findIndex((n) => n.id === id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
    setSelectedId((selected) => {
      if (selected !== id) return selected;
      const remaining = current.filter((n) => n.id !== id);
      if (remaining.length === 0) return null;
      return remaining[Math.min(index, remaining.length - 1)].id;
    });
  }, []);

  const ask = useCallback(async (id: string, text: string) => {
    const question = text.trim();
    if (!question) return;
    const target = notesRef.current.find((n) => n.id === id);
    if (!target) return;

    const userMsg = createUserMessage(question);
    const pendingMsg = createPendingMessage();
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id ? appendMessages(n, [userMsg, pendingMsg]) : n,
      ),
    );

    const { answer, sources } = await chatBackend.ask(question, target);
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id ? settlePendingMessage(n, pendingMsg.id, answer, sources) : n,
      ),
    );
  }, []);

  const selected = notes.find((n) => n.id === selectedId) ?? null;
  return { notes, selected, selectedId, selectNote, ask, removeNote, flash };
}
