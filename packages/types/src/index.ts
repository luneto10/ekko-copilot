// Shared contracts between the Electron main process and the floating-widget renderer.

export type SpeakerId = 'Speaker_1' | 'Speaker_2';
export type AudioSource = 'mic' | 'system';

/** A single (interim or finalized) chunk of transcribed speech. */
export interface TranscriptSegment {
  speaker: SpeakerId;
  /** Human-friendly label, e.g. "Sales Rep" or "Customer". */
  speakerLabel: string;
  text: string;
  /** false = interim/recognizing, true = finalized/recognized. */
  isFinal: boolean;
  ts: number;
}

/** The rolling Markdown "CRM note" compiled from the conversation. */
export interface MemoryState {
  markdown: string;
  updatedAt: number;
}

export type WorkIqSourceKind = 'sharepoint' | 'email' | 'teams' | 'document';

export interface WorkIqSource {
  title: string;
  url: string;
  kind: WorkIqSourceKind;
}

/** A grounded answer returned from the (mocked or real) Work IQ API. */
export interface WorkIqResponse {
  query: string;
  answer: string;
  sources: WorkIqSource[];
  /** High-level topic/intent label, used to title the conversation key note. */
  topic?: string;
}

/** Loading-state ping for the Work IQ cold path. */
export interface WorkIqStatus {
  query: string;
  isSearching: boolean;
  /** High-level topic/intent label for the key note being searched. */
  topic?: string;
}

export type TacticKind = 'tactic' | 'objection' | 'info';

/** A short, real-time sales recommendation pushed to the UI. */
export interface CopilotTactic {
  text: string;
  kind: TacticKind;
  ts: number;
}

// ---------------------------------------------------------------------------
// Debug / Dev Inspector contracts (dev-only second window)
// ---------------------------------------------------------------------------

export type DebugLevel = 'info' | 'warn' | 'error' | 'event';

/** A single structured diagnostic record from the main process. */
export interface DebugEvent {
  id: number;
  ts: number;
  level: DebugLevel;
  /** Pipeline stage, e.g. 'audio' | 'speech' | 'intent' | 'workiq' | 'memory' | 'tactic'. */
  category: string;
  message: string;
  data?: unknown;
}

/** Rolling counters + current gauges, snapshotted ~1/s. */
export interface DebugMetrics {
  counters: Record<string, number>;
  gauges: Record<string, number | string | boolean>;
  ts: number;
}

/** Backfill sent to a freshly opened inspector window. */
export interface DebugSnapshot {
  events: DebugEvent[];
  metrics: DebugMetrics;
}

/** Inspector -> main: inject a synthetic finalized utterance into the pipeline. */
export interface TestTranscriptPayload {
  speaker: SpeakerId;
  text: string;
}

/** PCM audio payload streamed renderer -> main over IPC. */
export interface AudioChunkPayload {
  source: AudioSource;
  /** 16 kHz / 16-bit / mono little-endian PCM samples. */
  buffer: ArrayBuffer;
}

/** Canonical IPC channel names. Keep renderer + main in sync via this single source. */
export const IPC = {
  // renderer -> main
  AudioStart: 'audio:start',
  AudioStop: 'audio:stop',
  AudioChunk: 'audio:chunk',
  // window controls (renderer -> main)
  WindowCollapse: 'window:collapse',
  WindowExpand: 'window:expand',
  WindowDockMove: 'window:dock-move',
  WindowReset: 'window:reset',
  // shell (renderer -> main)
  ShellOpenExternal: 'shell:open-external',
  // chat (renderer <-> main, request/response)
  ChatAsk: 'chat:ask',
  // main -> renderer
  TranscriptSegment: 'transcript:segment',
  MemoryUpdate: 'memory:update',
  WorkIqStatus: 'workiq:status',
  WorkIqResult: 'workiq:result',
  CopilotTactic: 'copilot:tactic',
  // debug (dev-only inspector window)
  DebugEvent: 'debug:event',
  DebugInit: 'debug:init',
  DebugMetrics: 'debug:metrics',
  DebugTestTranscript: 'debug:test-transcript',
  DebugClear: 'debug:clear',
  DebugForceMemory: 'debug:force-memory',
  DebugForceTactic: 'debug:force-tactic',
} as const;

export type IpcChannel = (typeof IPC)[keyof typeof IPC];
