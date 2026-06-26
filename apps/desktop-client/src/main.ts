import path from 'node:path';
import { app, BrowserWindow, desktopCapturer, ipcMain, screen, session, shell } from 'electron';
import { IPC, type AudioChunkPayload, type TestTranscriptPayload } from '@workiq/types';
import { isSpeechConfigured, isOpenAiConfigured, env } from './env';
import { Orchestrator } from './orchestrator/Orchestrator';
import { debug } from './debug/DebugBus';

const DEV_URL = 'http://127.0.0.1:5173';

/** Full-window dimensions, restored when expanding from the collapsed dock. */
const EXPANDED_MIN_WIDTH = 360;
const EXPANDED_MIN_HEIGHT = 420;
/** Default window size, used by the dev "reset size" action. */
const DEFAULT_WIDTH = 440;
const DEFAULT_HEIGHT = 680;
/** Size of the small right-edge dock shown while collapsed. */
const COLLAPSED_WIDTH = 96;
const COLLAPSED_HEIGHT = 96;

let widgetWindow: BrowserWindow | null = null;
let debugWindow: BrowserWindow | null = null;
let orchestrator: Orchestrator | null = null;
/** Bounds saved when collapsing, so expanding restores the exact window. */
let expandedBounds: Electron.Rectangle | null = null;

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

/**
 * Shrink the widget into a small circular dock pinned to the right edge of the
 * display it currently sits on, keeping roughly the same vertical position. The
 * full bounds are saved so `expandWidget` can restore them exactly.
 */
function collapseWidget(): void {
  if (!widgetWindow) return;
  const bounds = widgetWindow.getBounds();
  expandedBounds = bounds;

  const { workArea } = screen.getDisplayMatching(bounds);
  const x = workArea.x + workArea.width - COLLAPSED_WIDTH;
  const maxY = workArea.y + workArea.height - COLLAPSED_HEIGHT;
  const y = Math.min(Math.max(bounds.y, workArea.y), maxY);

  // Drop the min-size constraint so the window can shrink to the dock size.
  widgetWindow.setMinimumSize(1, 1);
  widgetWindow.setResizable(false);
  widgetWindow.setBounds({ x, y, width: COLLAPSED_WIDTH, height: COLLAPSED_HEIGHT });
}

/** Restore the widget to its pre-collapse size and position. */
function expandWidget(): void {
  if (!widgetWindow) return;
  widgetWindow.setMinimumSize(EXPANDED_MIN_WIDTH, EXPANDED_MIN_HEIGHT);
  widgetWindow.setResizable(true);
  if (expandedBounds) widgetWindow.setBounds(expandedBounds);
}

/**
 * Move the collapsed dock vertically by `dy` pixels. The x position stays
 * pinned to the right edge of the display, so the dock can only slide up and
 * down — never left/right.
 */
function moveDock(dy: number): void {
  if (!widgetWindow) return;
  const bounds = widgetWindow.getBounds();
  const { workArea } = screen.getDisplayMatching(bounds);
  const x = workArea.x + workArea.width - bounds.width;
  const maxY = workArea.y + workArea.height - bounds.height;
  const y = Math.min(Math.max(bounds.y + Math.round(dy), workArea.y), maxY);
  widgetWindow.setBounds({ x, y, width: bounds.width, height: bounds.height });
}

/**
 * Dev escape hatch: force the window back to its default size and re-center it
 * on the current display, clearing any saved collapse bounds.
 */
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
    // Only allow real web links to be opened externally.
    if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) return;
    // SharePoint/OneDrive serves direct file URLs as a DOWNLOAD; `?web=1` opens
    // them in the browser viewer instead.
    const isSharePoint = /\.sharepoint\.com/i.test(url);
    const target = isSharePoint && !url.includes('?') ? `${url}?web=1` : url;
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
