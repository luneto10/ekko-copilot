import path from 'node:path';
import { app, BrowserWindow, desktopCapturer, ipcMain, screen, session, shell } from 'electron';
import { IPC, type AudioChunkPayload, type TestTranscriptPayload } from '@workiq/types';
import { isSpeechConfigured, isOpenAiConfigured, env } from './env';
import { Orchestrator } from './orchestrator/Orchestrator';
import { debug } from './debug/DebugBus';

const DEV_URL = 'http://127.0.0.1:5173';
const EXPANDED_MIN_WIDTH = 360;
const EXPANDED_MIN_HEIGHT = 420;
const DEFAULT_WIDTH = 440;
const DEFAULT_HEIGHT = 680;
const COLLAPSED_WIDTH = 96;
const COLLAPSED_HEIGHT = 96;

let widgetWindow: BrowserWindow | null = null;
let debugWindow: BrowserWindow | null = null;
let orchestrator: Orchestrator | null = null;
let expandedBounds: Electron.Rectangle | null = null;

function createWidgetWindow(): void {
  widgetWindow = new BrowserWindow({
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    minWidth: EXPANDED_MIN_WIDTH,
    minHeight: EXPANDED_MIN_HEIGHT,
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

function collapseWidget(): void {
  if (!widgetWindow) return;
  const bounds = widgetWindow.getBounds();
  expandedBounds = bounds;

  const { workArea } = screen.getDisplayMatching(bounds);
  const x = workArea.x + workArea.width - COLLAPSED_WIDTH;
  const maxY = workArea.y + workArea.height - COLLAPSED_HEIGHT;
  const y = Math.min(Math.max(bounds.y, workArea.y), maxY);

  widgetWindow.setMinimumSize(1, 1);
  widgetWindow.setResizable(false);
  widgetWindow.setBounds({ x, y, width: COLLAPSED_WIDTH, height: COLLAPSED_HEIGHT });
}

function expandWidget(): void {
  if (!widgetWindow) return;
  widgetWindow.setMinimumSize(EXPANDED_MIN_WIDTH, EXPANDED_MIN_HEIGHT);
  widgetWindow.setResizable(true);
  if (expandedBounds) widgetWindow.setBounds(expandedBounds);
}

function moveDock(dy: number): void {
  if (!widgetWindow) return;
  const bounds = widgetWindow.getBounds();
  const { workArea } = screen.getDisplayMatching(bounds);
  const x = workArea.x + workArea.width - bounds.width;
  const maxY = workArea.y + workArea.height - bounds.height;
  const y = Math.min(Math.max(bounds.y + Math.round(dy), workArea.y), maxY);
  widgetWindow.setBounds({ x, y, width: bounds.width, height: bounds.height });
}

function resetWindow(): void {
  if (!widgetWindow) return;
  expandedBounds = null;
  widgetWindow.setMinimumSize(EXPANDED_MIN_WIDTH, EXPANDED_MIN_HEIGHT);
  widgetWindow.setResizable(true);
  const { workArea } = screen.getDisplayMatching(widgetWindow.getBounds());
  const x = Math.round(workArea.x + (workArea.width - DEFAULT_WIDTH) / 2);
  const y = Math.round(workArea.y + (workArea.height - DEFAULT_HEIGHT) / 2);
  widgetWindow.setBounds({ x, y, width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });
}

function externalBrowserUrl(url: string): string | null {
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) return null;
  return /\.sharepoint\.com/i.test(url) && !url.includes('?') ? `${url}?web=1` : url;
}

function registerIpc(): void {
  ipcMain.on(IPC.AudioStart, () => {
    debug.event('audio', 'capture started');
    orchestrator?.setActive(true);
  });
  ipcMain.on(IPC.AudioStop, () => {
    debug.event('audio', 'capture stopped');
    orchestrator?.setActive(false);
  });
  ipcMain.on(IPC.AudioChunk, (_event, payload: AudioChunkPayload) => {
    const buffer = toArrayBuffer(payload.buffer);
    debug.count(`audio.chunks.${payload.source}`);
    debug.count(`audio.bytes.${payload.source}`, buffer.byteLength);
    orchestrator?.pushAudio(payload.source, buffer);
  });

  ipcMain.on(IPC.WindowCollapse, () => collapseWidget());
  ipcMain.on(IPC.WindowExpand, () => expandWidget());
  ipcMain.on(IPC.WindowDockMove, (_event, dy: number) => moveDock(dy));
  ipcMain.on(IPC.WindowReset, () => resetWindow());
  ipcMain.on(IPC.ShellOpenExternal, (_event, url: string) => {
    const target = externalBrowserUrl(url);
    if (!target) return;
    void shell.openExternal(target);
  });
  ipcMain.handle(
    IPC.ChatAsk,
    async (_event, payload: { question: string; topic: string }) => {
      if (!orchestrator) return { answer: '', sources: [] };
      const result = await orchestrator.ask(payload.question, payload.topic ?? '');
      return { answer: result.answer, sources: result.sources };
    },
  );

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
    debug.warn('config', 'AZURE_SPEECH_KEY/REGION not set; transcription disabled (UI still runs).');
  }
  if (!isOpenAiConfigured()) {
    debug.warn('config', 'AZURE_OPENAI_* not set; memory/tactics disabled (UI still runs).');
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
