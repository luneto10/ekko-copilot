interface StatusPillProps {
  ok: boolean;
  label: string;
}

export function StatusPill({ ok, label }: StatusPillProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] ${
        ok
          ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
          : 'border-rose-500/40 bg-rose-500/15 text-rose-300'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-emerald-300' : 'bg-rose-300'}`} />
      {label}
    </span>
  );
}
