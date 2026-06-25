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
  WorkIqStatus,
} from '@workiq/types';

/**
 * Ambient declaration of the API the preload exposes on `window.workiq`.
 *
 * This is the renderer-side half of the IPC contract. Its counterpart lives in
 * `apps/desktop-client/src/preload.ts`, and the channel names are defined once
 * in `@workiq/types` (`IPC`). When you add a new IPC method:
 *   1. add the channel to `IPC` in `@workiq/types`,
 *   2. wire it in the preload + main process,
 *   3. add the method signature here.
 *
 * Every `on*` subscriber returns an unsubscribe function `() => void`, which is
 * what the feature hooks return from `useEffect` for automatic cleanup.
 *
 * NOTE: this file is intentionally named `workiq.d.ts` (not `bridge.d.ts`) so it
 * doesn't collide with the `bridge.ts` module basename — otherwise TypeScript
 * would treat it as that module's declarations and ignore the `declare global`.
 */
declare global {
  interface Window {
    workiq: {
      /** Notify main that capture started (telemetry only). */
      startAudio(): void;
      /** Notify main that capture stopped (telemetry only). */
      stopAudio(): void;
      /** Stream a chunk of 16 kHz/16-bit/mono PCM for a given source. */
      sendChunk(source: AudioSource, buffer: ArrayBuffer): void;

      /** Shrink the widget into the small right-edge dock. */
      collapseWindow(): void;
      /** Restore the widget to its pre-collapse size and position. */
      expandWindow(): void;
      /** Move the collapsed dock vertically by `dy` pixels (x stays pinned). */
      moveDock(dy: number): void;
      /** Dev: force the window back to its default size and re-center it. */
      resetWindow(): void;

      // --- main -> renderer event streams (each returns an unsubscribe fn) ---
      onTranscript(cb: (segment: TranscriptSegment) => void): () => void;
      onMemory(cb: (memory: MemoryState) => void): () => void;
      onWorkIqStatus(cb: (status: WorkIqStatus) => void): () => void;
      onWorkIqResult(cb: (result: WorkIqResponse) => void): () => void;
      onTactic(cb: (tactic: CopilotTactic) => void): () => void;

      // --- Dev Inspector (dev-only window) ---
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

/**
 * Allow Electron's window-drag CSS property on React `style` objects, e.g.
 * `style={{ WebkitAppRegion: 'drag' }}` on the frameless window's header.
 */
declare module 'react' {
  interface CSSProperties {
    WebkitAppRegion?: 'drag' | 'no-drag';
  }
}

export {};
