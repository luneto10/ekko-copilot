interface StatusPillProps {
  /** Whether the thing is healthy/enabled (green) or not (red). */
  ok: boolean;
  /** Short label, e.g. "Speech" or "OpenAI". */
  label: string;
}

/**
 * Small green/red status indicator (a filled vs hollow dot + label).
 *
 * Reused by the widget header and the Dev Inspector so status chips look the
 * same everywhere.
 */
export function StatusPill({ ok, label }: StatusPillProps) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[11px] ${
        ok
          ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
          : 'border-rose-500/40 bg-rose-500/15 text-rose-300'
      }`}
    >
      {ok ? '●' : '○'} {label}
    </span>
  );
}
