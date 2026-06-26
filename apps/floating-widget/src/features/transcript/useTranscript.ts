import { useEffect, useState } from 'react';
import type { SpeakerId, TranscriptSegment } from '@workiq/types';
import { bridge } from '@/shared/bridge';

type InterimMap = Record<SpeakerId, string>;

const MAX_FINALS = 200;

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
