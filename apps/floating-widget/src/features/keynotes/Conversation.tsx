import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { SOURCE_ICON } from '@/shared/theme';
import { useConversation } from './useConversation';
import type { ChatMessage, KeyNote } from './types';

/**
 * Conversation panel — replaces the old Live Feed + Call Intelligence.
 *
 * Top: a horizontally-scrollable row of "key note" pills, one per question
 * raised in the call. Selecting a pill opens its own chat (bottom), pre-seeded
 * with the Work IQ answer + the files it found, where the rep can ask follow-ups.
 */
export function Conversation() {
  const { notes, selected, selectedId, selectNote, ask } = useConversation();
  const [draft, setDraft] = useState('');
  const chatRef = useRef<HTMLDivElement>(null);

  // Keep the chat pinned to the newest message. Scroll only this container so
  // it never disturbs the window/dock.
  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, [selectedId, selected?.messages.length]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    void ask(selected.id, draft);
    setDraft('');
  };

  return (
    <div className="glass-surface flex h-full flex-col rounded-2xl border border-white/10">
      {/* Key-note pills — scroll horizontally to pick one. */}
      <div className="border-b border-white/10 px-3 py-2">
        {notes.length === 0 ? (
          <span className="text-xs italic text-slate-500">Key notes from the call appear here…</span>
        ) : (
          <PillRail notes={notes} selectedId={selectedId} onSelect={selectNote} />
        )}
      </div>

      {/* Chat for the selected note. */}
      <div ref={chatRef} className="flex-1 space-y-2 overflow-y-auto px-3 py-3 text-sm">
        {!selected ? (
          <div className="flex h-full items-center justify-center px-4 text-center text-xs italic text-slate-500">
            When a customer asks something, it shows up here as a key note you can dig into.
          </div>
        ) : (
          <Thread note={selected} onSuggestion={(q) => void ask(selected.id, q)} />
        )}
      </div>

      {/* Ask box. */}
      <form onSubmit={submit} className="flex items-center gap-2 border-t border-white/10 p-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={selected ? `Ask about ${selected.topic}…` : 'Select a key note to chat'}
          disabled={!selected}
          className="min-w-0 flex-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-100 outline-none transition focus:border-sky-500/50 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!selected || !draft.trim()}
          className="flex-shrink-0 rounded-full bg-sky-500/80 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-500 disabled:opacity-40"
        >
          Ask
        </button>
      </form>
    </div>
  );
}

/**
 * A horizontally-scrollable rail of key-note pills, with edge fades + chevron
 * buttons that appear only when there's more to scroll to.
 */
function PillRail({
  notes,
  selectedId,
  onSelect,
}: {
  notes: KeyNote[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  const update = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    const left = el.scrollLeft > 1;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
    setEdges((prev) => (prev.left === left && prev.right === right ? prev : { left, right }));
  }, []);

  useEffect(() => {
    update();
    const el = railRef.current;
    if (!el) return;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [update, notes.length]);

  const nudge = (dx: number) => railRef.current?.scrollBy({ left: dx, behavior: 'smooth' });

  return (
    <div className="relative">
      {edges.left && (
        <button
          type="button"
          onClick={() => nudge(-140)}
          aria-label="Scroll key notes left"
          className="absolute inset-y-0 left-0 z-10 flex w-7 items-center justify-start bg-gradient-to-r from-[var(--surface-bg)] to-transparent text-slate-300"
        >
          <Chevron dir="left" />
        </button>
      )}

      <div
        ref={railRef}
        onScroll={update}
        className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {notes.map((note) => (
          <Pill
            key={note.id}
            note={note}
            active={note.id === selectedId}
            onSelect={() => onSelect(note.id)}
          />
        ))}
      </div>

      {edges.right && (
        <button
          type="button"
          onClick={() => nudge(140)}
          aria-label="Scroll key notes right"
          className="absolute inset-y-0 right-0 z-10 flex w-7 items-center justify-end bg-gradient-to-l from-[var(--surface-bg)] to-transparent text-slate-300"
        >
          <Chevron dir="right" />
        </button>
      )}
    </div>
  );
}

/** Tiny left/right chevron used by the scroll affordances. */
function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {dir === 'left' ? <polyline points="15 6 9 12 15 18" /> : <polyline points="9 6 15 12 9 18" />}
    </svg>
  );
}

/** A single key-note pill. */
function Pill({
  note,
  active,
  onSelect,
}: {
  note: KeyNote;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      title={note.query}
      className={`flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition ${
        active
          ? 'border-sky-400/60 bg-sky-500/20 text-slate-100'
          : 'border-white/10 text-slate-300 hover:bg-white/10'
      }`}
    >
      {note.status === 'searching' ? (
        <span className="h-1.5 w-1.5 animate-ping rounded-full bg-amber-400" />
      ) : (
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
      )}
      {note.topic}
    </button>
  );
}

/** The chat thread for one note: messages + suggested follow-ups. */
function Thread({ note, onSuggestion }: { note: KeyNote; onSuggestion: (q: string) => void }) {
  return (
    <>
      {note.status === 'searching' && note.messages.length === 0 && (
        <div className="flex items-center gap-2 text-sky-200">
          <span className="h-2 w-2 animate-ping rounded-full bg-sky-400" />
          Searching Work IQ for “{note.query}”…
        </div>
      )}

      {note.messages.map((msg) => (
        <Bubble key={msg.id} msg={msg} />
      ))}

      {note.suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {note.suggestions.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => onSuggestion(q)}
              className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-slate-300 transition hover:bg-white/10"
            >
              {q}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

/** A single chat bubble (user right, assistant left with source chips). */
function Bubble({ msg }: { msg: ChatMessage }) {
  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-sky-500/80 px-3 py-1.5 text-white">
          {msg.text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] rounded-2xl rounded-bl-sm border border-white/10 bg-white/5 px-3 py-1.5">
        {msg.pending ? (
          <span className="flex items-center gap-2 text-sky-200">
            <span className="h-2 w-2 animate-ping rounded-full bg-sky-400" />
            Searching Work IQ…
          </span>
        ) : (
          <>
            <p className="text-slate-100">{msg.text}</p>
            {msg.sources && msg.sources.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {msg.sources.map((source) => (
                  <span
                    key={source.url}
                    title={source.url}
                    className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-300"
                  >
                    {SOURCE_ICON[source.kind]} {source.title}
                  </span>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
