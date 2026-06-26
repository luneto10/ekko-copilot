import type {
  AudioSource,
  CopilotTactic,
  DebugEvent,
  DebugMetrics,
  DebugSnapshot,
  MemoryState,
  SpeakerId,
  TranscriptSegment,
  WorkIqResponse,
  WorkIqSource,
  WorkIqStatus,
} from '@workiq/types';

declare global {
  interface Window {
    workiq: {
      startAudio(): void;
      stopAudio(): void;
      sendChunk(source: AudioSource, buffer: ArrayBuffer): void;

      collapseWindow(): void;
      expandWindow(): void;
      moveDock(dy: number): void;
      resetWindow(): void;
      openExternal(url: string): void;
      askChat(question: string, topic: string): Promise<{ answer: string; sources: WorkIqSource[] }>;

      onTranscript(cb: (segment: TranscriptSegment) => void): () => void;
      onMemory(cb: (memory: MemoryState) => void): () => void;
      onWorkIqStatus(cb: (status: WorkIqStatus) => void): () => void;
      onWorkIqResult(cb: (result: WorkIqResponse) => void): () => void;
      onTactic(cb: (tactic: CopilotTactic) => void): () => void;

      onDebugInit(cb: (snapshot: DebugSnapshot) => void): () => void;
      onDebugEvent(cb: (event: DebugEvent) => void): () => void;
      onDebugMetrics(cb: (metrics: DebugMetrics) => void): () => void;
      sendTestTranscript(speaker: SpeakerId, text: string): void;
      clearDebug(): void;
      forceMemoryCompile(): void;
      forceTactic(): void;
    };
  }
}

declare module 'react' {
  interface CSSProperties {
    WebkitAppRegion?: 'drag' | 'no-drag';
  }
}

export {};
