import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import {
  IPC,
  type AudioSource,
  type CopilotTactic,
  type DebugEvent,
  type DebugMetrics,
  type DebugSnapshot,
  type MemoryState,
  type SpeakerId,
  type TranscriptSegment,
  type WorkIqResponse,
  type WorkIqStatus,
} from '@workiq/types';

function subscribe<T>(channel: string, cb: (payload: T) => void): () => void {
  const listener = (_event: IpcRendererEvent, payload: T) => cb(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

// The ONLY surface exposed to the renderer. No Azure keys ever cross this bridge.
contextBridge.exposeInMainWorld('workiq', {
  startAudio: () => ipcRenderer.send(IPC.AudioStart),
  stopAudio: () => ipcRenderer.send(IPC.AudioStop),
  sendChunk: (source: AudioSource, buffer: ArrayBuffer) =>
    ipcRenderer.send(IPC.AudioChunk, { source, buffer }),

  // --- Window controls ---
  collapseWindow: () => ipcRenderer.send(IPC.WindowCollapse),
  expandWindow: () => ipcRenderer.send(IPC.WindowExpand),
  moveDock: (dy: number) => ipcRenderer.send(IPC.WindowDockMove, dy),

  onTranscript: (cb: (segment: TranscriptSegment) => void) =>
    subscribe(IPC.TranscriptSegment, cb),
  onMemory: (cb: (memory: MemoryState) => void) => subscribe(IPC.MemoryUpdate, cb),
  onWorkIqStatus: (cb: (status: WorkIqStatus) => void) => subscribe(IPC.WorkIqStatus, cb),
  onWorkIqResult: (cb: (result: WorkIqResponse) => void) => subscribe(IPC.WorkIqResult, cb),
  onTactic: (cb: (tactic: CopilotTactic) => void) => subscribe(IPC.CopilotTactic, cb),

  // --- Dev Inspector (dev-only second window) ---
  onDebugInit: (cb: (snapshot: DebugSnapshot) => void) => subscribe(IPC.DebugInit, cb),
  onDebugEvent: (cb: (event: DebugEvent) => void) => subscribe(IPC.DebugEvent, cb),
  onDebugMetrics: (cb: (metrics: DebugMetrics) => void) => subscribe(IPC.DebugMetrics, cb),
  sendTestTranscript: (speaker: SpeakerId, text: string) =>
    ipcRenderer.send(IPC.DebugTestTranscript, { speaker, text }),
  clearDebug: () => ipcRenderer.send(IPC.DebugClear),
  forceMemoryCompile: () => ipcRenderer.send(IPC.DebugForceMemory),
  forceTactic: () => ipcRenderer.send(IPC.DebugForceTactic),
});
