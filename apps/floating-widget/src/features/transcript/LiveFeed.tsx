import { useEffect, useRef } from 'react';
import type { SpeakerId } from '@workiq/types';
import { SPEAKER_COLOR, SPEAKER_LABEL } from '@/shared/theme';
import { useTranscript } from './useTranscript';

export function LiveFeed() {
  const { finals, interims } = useTranscript();
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' });
  }, [finals, interims]);

  const interimEntries = (Object.entries(interims) as [SpeakerId, string][]).filter(
    ([, text]) => text.trim().length > 0,
  );

  return (
    <div className="glass-surface flex flex-col rounded-2xl border border-white/10">
      <div className="flex items-center gap-1.5 border-b border-white/10 px-3 py-1">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Live Transcript
        </span>
      </div>
      <div
        ref={bodyRef}
        className="max-h-20 space-y-1 overflow-y-auto px-3 py-2 text-xs leading-snug"
      >
        {finals.length === 0 && interimEntries.length === 0 && (
          <p className="italic text-slate-500">Waiting for the conversation...</p>
        )}
        {finals.map((segment, index) => (
          <p key={`${segment.ts}-${index}`}>
            <span className={`font-semibold ${SPEAKER_COLOR[segment.speaker]}`}>
              {segment.speakerLabel}:{' '}
            </span>
            <span className="text-slate-200">{segment.text}</span>
          </p>
        ))}
        {interimEntries.map(([speaker, text]) => (
          <p key={speaker} className="opacity-60">
            <span className={`font-semibold ${SPEAKER_COLOR[speaker]}`}>
              {SPEAKER_LABEL[speaker]}:{' '}
            </span>
            <span className="italic text-slate-400">{text}</span>
          </p>
        ))}
      </div>
    </div>
  );
}
