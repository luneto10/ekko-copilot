import path from 'node:path';
import { app, BrowserWindow, desktopCapturer, ipcMain, session } from 'electron';
import { IPC, type AudioChunkPayload, type TestTranscriptPayload } from '@workiq/types';
import { isSpeechConfigured, isOpenAiConfigured, env } from './env';
import { Orchestrator } from './orchestrator/Orchestrator';
import { debug } from './debug/DebugBus';

const DEV_URL = 'http://127.0.0.1:5173';

let widgetWindow: BrowserWindow | null = null;
let debugWindow: BrowserWindow | null = null;
let orchestrator: Orchestrator | null = null;

function createWidgetWindow(): void {
  widgetWindow = new BrowserWindow({
    width: 440,
    height: 680,
    minWidth: 360,
    minHeight: 420,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    resizable: true,
    hasShadow: false,
    skipTaskbar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Keep the widget above full-screen apps (e.g. a Teams call).
  widgetWindow.setAlwaysOnTop(true, 'screen-saver');
  widgetWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  if (!app.isPackaged) {
    void widgetWindow.loadURL(DEV_URL);
  } else {
    void widgetWindow.loadFile(
      path.join(__dirname, '..', '..', 'floating-widget', 'dist', 'index.html'),
    );
  }

  widgetWindow.on('closed', () => {
    widgetWindow = null;
  });
}

/**
 * A normal (framed, opaque) window that visualizes the live pipeline: event log,
 * counters, latencies, raw memory.md, and a transcript injector. Dev only.
 */
function createDebugWindow(): void {
  debugWindow = new BrowserWindow({
    width: 980,
    height: 760,
    title: 'WorkIQ Dev Inspector',
    backgroundColor: '#0b1220',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  void debugWindow.loadURL(`${DEV_URL}?view=debug`);
  debugWindow.webContents.on('did-finish-load', () => {
    if (debugWindow) debug.attach(debugWindow.webContents);
  });
  debugWindow.on('closed', () => {
    debug.detach();
    debugWindow = null;
  });
}

/**
 * Grant the renderer system-audio loopback + microphone access without a picker
 * dialog. `audio: 'loopback'` (Electron >= 31 on Windows) captures the computer's
 * output so we can hear the remote Teams participant.
 */
function setupMediaAccess(): void {
  session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => {
    callback(true);
  });

  session.defaultSession.setDisplayMediaRequestHandler(
    (_request, callback) => {
      desktopCapturer
        .getSources({ types: ['screen'] })
        .then((sources) => {
          callback({ video: sources[0], audio: 'loopback' });
        })
        .catch(() => {
          // No screen source available — deny gracefully.
          callback({});
        });
    },
    { useSystemPicker: false },
  );
}

function toArrayBuffer(buffer: ArrayBuffer | Uint8Array): ArrayBuffer {
  if (buffer instanceof ArrayBuffer) return buffer;
  const source = buffer.buffer as ArrayBuffer;
  return source.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

function registerIpc(): void {
  ipcMain.on(IPC.AudioStart, () => {
    debug.event('audio', 'capture started');
  });
  ipcMain.on(IPC.AudioStop, () => {
    debug.event('audio', 'capture stopped');
  });
  ipcMain.on(IPC.AudioChunk, (_event, payload: AudioChunkPayload) => {
    const buffer = toArrayBuffer(payload.buffer);
    debug.count(`audio.chunks.${payload.source}`);
    debug.count(`audio.bytes.${payload.source}`, buffer.byteLength);
    orchestrator?.pushAudio(payload.source, buffer);
  });

  ipcMain.on(IPC.DebugTestTranscript, (_event, payload: TestTranscriptPayload) => {
    orchestrator?.injectTranscript(payload.speaker, payload.text);
  });
  ipcMain.on(IPC.DebugClear, () => debug.clear());
  ipcMain.on(IPC.DebugForceMemory, () => orchestrator?.forceMemoryCompile());
  ipcMain.on(IPC.DebugForceTactic, () => orchestrator?.forceTactic());
}

app.whenReady().then(() => {
  debug.gauge('speech.configured', isSpeechConfigured());
  debug.gauge('openai.configured', isOpenAiConfigured());
  debug.gauge('openai.deployment', env.openAiDeployment);
  debug.gauge('workiq.mode', env.workIqMode);
  if (!isSpeechConfigured()) {
    debug.warn('config', 'AZURE_SPEECH_KEY/REGION not set — transcription disabled (UI still runs).');
  }
  if (!isOpenAiConfigured()) {
    debug.warn('config', 'AZURE_OPENAI_* not set — memory/tactics disabled (UI still runs).');
  }
  debug.info('config', `Work IQ mode: ${env.workIqMode}`);

  setupMediaAccess();
  registerIpc();
  createWidgetWindow();
  if (!app.isPackaged) createDebugWindow();

  orchestrator = new Orchestrator({
    emit: (channel, payload) => widgetWindow?.webContents.send(channel, payload),
  });
  orchestrator.start();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWidgetWindow();
  });
});

app.on('window-all-closed', () => {
  orchestrator?.stop();
  if (process.platform !== 'darwin') app.quit();
});
