import { useEffect, useState } from 'react';
import type { SpeakerId, TranscriptSegment } from '@workiq/types';
import { bridge } from '@/shared/bridge';

type InterimMap = Record<SpeakerId, string>;

/** How many finalized utterances to keep in memory for rendering. */
const MAX_FINALS = 200;

/**
 * Owns the Live Feed's state (Single Responsibility): the list of finalized
 * utterances plus the current in-flight (interim) text per speaker.
 *
 * Subscribes to `transcript:segment` on mount and unsubscribes on unmount —
 * `bridge.onTranscript` returns the unsubscribe fn, which we hand straight back
 * to React from `useEffect`.
 */
export function useTranscript() {
  const [finals, setFinals] = useState<TranscriptSegment[]>([]);
  const [interims, setInterims] = useState<InterimMap>({ Speaker_1: '', Speaker_2: '' });

  useEffect(
    () =>
      bridge.onTranscript((segment) => {
        if (segment.isFinal) {
          setFinals((prev) => [...prev.slice(-MAX_FINALS), segment]);
          setInterims((prev) => ({ ...prev, [segment.speaker]: '' }));
        } else {
          setInterims((prev) => ({ ...prev, [segment.speaker]: segment.text }));
        }
      }),
    [],
  );

  return { finals, interims };
}
