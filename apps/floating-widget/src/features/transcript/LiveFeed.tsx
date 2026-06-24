import { useEffect, useRef } from 'react';
import type { SpeakerId } from '@workiq/types';
import { Panel } from '@/shared/ui/Panel';
import { SPEAKER_COLOR, SPEAKER_LABEL } from '@/shared/theme';
import { useTranscript } from './useTranscript';

/**
 * Live Feed panel — the running dialogue, grouped and coloured by speaker.
 *
 * Self-contained: it pulls its own data from `useTranscript`, so the layout
 * renders it with no props. Finalized lines render solid; the current interim
 * line per speaker renders dimmed/italic. Auto-scrolls to the newest line.
 */
export function LiveFeed() {
  const { finals, interims } = useTranscript();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [finals, interims]);

  const interimEntries = (Object.entries(interims) as [SpeakerId, string][]).filter(
    ([, text]) => text.trim().length > 0,
  );

  return (
    <Panel title="Live Feed" bodyClassName="space-y-2 text-sm">
      {finals.length === 0 && interimEntries.length === 0 && (
        <p className="text-xs italic text-slate-500">Waiting for the conversation…</p>
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
      <div ref={endRef} />
    </Panel>
  );
}
