import {
  IPC,
  type AudioSource,
  type IpcChannel,
  type SpeakerId,
  type TranscriptSegment,
} from '@workiq/types';
import { SourceRecognizer } from '../speech/SourceRecognizer';
import { isSpeechConfigured, env } from '../env';
import { RollingBuffer } from './RollingBuffer';
import { MemoryCompiler } from './MemoryCompiler';
import { IntentDetector, type SalesIntent } from './IntentDetector';
import { INITIAL_MEMORY } from './prompts';
import { createWorkIqClient, type WorkIqClient } from '../workiq/WorkIqClient';
import { debug } from '../debug/DebugBus';

type Emit = (channel: IpcChannel, payload: unknown) => void;

const TACTIC_INTERVAL_MS = 60_000;
const HISTORY_LIMIT = 40;

interface OrchestratorOptions {
  emit: Emit;
}

/**
 * Decoupled orchestration core.
 *  - HOT path: audio -> Azure Speech -> rolling buffer (zero blocking).
 *  - Memory loop: flush -> Azure OpenAI -> memory.md -> UI.
 *  - COLD path: customer intent -> async Work IQ lookup -> UI (never awaited on the hot path).
 */
export class Orchestrator {
  private readonly emit: Emit;
  private readonly buffer = new RollingBuffer();
  private readonly memoryCompiler = new MemoryCompiler();
  private readonly intentDetector = new IntentDetector();
  private readonly workIq: WorkIqClient;

  private micRecognizer: SourceRecognizer | null = null;
  private systemRecognizer: SourceRecognizer | null = null;
  private tacticTimer: NodeJS.Timeout | null = null;

  private memoryMarkdown = INITIAL_MEMORY;
  private history: TranscriptSegment[] = [];
  private compiling = false;
  private readonly flushWords = env.memoryFlushWords;

  constructor({ emit }: OrchestratorOptions) {
    this.emit = emit;
    this.workIq = createWorkIqClient();
  }

  start(): void {
    if (isSpeechConfigured()) {
      const onSegment = (segment: TranscriptSegment) => this.handleSegment(segment);
      this.micRecognizer = new SourceRecognizer('Speaker_1', 'Sales Rep', onSegment);
      this.systemRecognizer = new SourceRecognizer('Speaker_2', 'Customer', onSegment);
    }
    debug.gauge('recognizers', isSpeechConfigured() ? 2 : 0);
    debug.gauge('workiq.client', this.workIq.constructor.name);
    debug.gauge('memory.flushWords', this.flushWords);
    debug.event('orchestrator', `started (speech ${isSpeechConfigured() ? 'on' : 'off'})`);
    this.tacticTimer = setInterval(() => void this.generateTactic(), TACTIC_INTERVAL_MS);
    this.emit(IPC.MemoryUpdate, { markdown: this.memoryMarkdown, updatedAt: Date.now() });
  }

  stop(): void {
    if (this.tacticTimer) clearInterval(this.tacticTimer);
    this.micRecognizer?.close();
    this.systemRecognizer?.close();
  }

  /** Feed PCM from the renderer's audio capture into the right recognizer. */
  pushAudio(source: AudioSource, buffer: ArrayBuffer): void {
    if (source === 'mic') this.micRecognizer?.write(buffer);
    else this.systemRecognizer?.write(buffer);
  }

  private handleSegment(segment: TranscriptSegment): void {
    // Always stream the segment to the live feed (interim + final).
    this.emit(IPC.TranscriptSegment, segment);
    if (!segment.isFinal) {
      debug.count(`interim.${segment.speaker}`);
      return;
    }

    this.buffer.add(segment);
    this.history.push(segment);
    if (this.history.length > HISTORY_LIMIT) this.history.shift();
    debug.count('finals');
    debug.gauge('buffer.words', this.buffer.wordCount());
    debug.event('transcript', `${segment.speakerLabel}: ${segment.text}`, { speaker: segment.speaker });

    // COLD path: only trigger on a customer question to avoid noise from the rep.
    if (segment.speaker === 'Speaker_2') {
      const intent = this.intentDetector.detect(segment.text);
      if (intent) {
        debug.count('intents');
        debug.event('intent', `Detected '${intent}'`, { intent, text: segment.text });
        void this.runWorkIq(intent, segment.text);
      }
    }

    // Memory loop: flush at a natural pause (final segment) past the word threshold.
    if (this.buffer.wordCount() > this.flushWords && !this.compiling) {
      debug.event('memory', `flush triggered (${this.buffer.wordCount()} words)`);
      void this.compileMemory(this.buffer.flush());
    }
  }

  private async compileMemory(block: string): Promise<void> {
    this.compiling = true;
    const started = Date.now();
    try {
      this.memoryMarkdown = await this.memoryCompiler.compile(this.memoryMarkdown, block);
      const ms = Date.now() - started;
      debug.count('memory.compiles');
      debug.gauge('memory.lastMs', ms);
      debug.event('memory', `compiled in ${ms}ms`, { markdown: this.memoryMarkdown });
      this.emit(IPC.MemoryUpdate, { markdown: this.memoryMarkdown, updatedAt: Date.now() });
    } catch (err) {
      debug.error('memory', 'compile failed', { error: String(err) });
    } finally {
      this.compiling = false;
    }
  }

  private async runWorkIq(intent: SalesIntent, query: string): Promise<void> {
    this.emit(IPC.WorkIqStatus, { query, isSearching: true });
    debug.count('workiq.calls');
    debug.event('workiq', `query → "${query}"`, { intent });
    const started = Date.now();
    try {
      const result = await this.workIq.query(query, intent);
      const ms = Date.now() - started;
      debug.gauge('workiq.lastMs', ms);
      debug.event('workiq', `result in ${ms}ms`, { answer: result.answer, sources: result.sources });
      this.emit(IPC.WorkIqResult, result);
    } catch (err) {
      debug.error('workiq', 'query failed', { error: String(err) });
    } finally {
      this.emit(IPC.WorkIqStatus, { query, isSearching: false });
    }
  }

  private async generateTactic(): Promise<void> {
    if (this.history.length === 0) return;
    const recent = this.history
      .slice(-8)
      .map((s) => `${s.speakerLabel}: ${s.text}`)
      .join('\n');
    try {
      const text = await this.memoryCompiler.tactic(this.memoryMarkdown, recent);
      if (text) {
        debug.count('tactics');
        debug.event('tactic', text);
        this.emit(IPC.CopilotTactic, { text, kind: 'tactic', ts: Date.now() });
      }
    } catch (err) {
      debug.error('tactic', 'generation failed', { error: String(err) });
    }
  }

  /**
   * Dev Inspector hook: inject a synthetic finalized utterance so the full
   * pipeline (intent -> Work IQ, buffer -> memory) can be exercised without
   * speaking. Flows through the exact same path as real recognized speech.
   */
  injectTranscript(speaker: SpeakerId, text: string): void {
    const speakerLabel = speaker === 'Speaker_1' ? 'Sales Rep' : 'Customer';
    debug.event('test', `injected ${speakerLabel}: ${text}`, { speaker });
    this.handleSegment({ speaker, speakerLabel, text, isFinal: true, ts: Date.now() });
  }

  /** Dev Inspector: compile memory immediately, ignoring the word threshold. */
  forceMemoryCompile(): void {
    const block = this.buffer.isEmpty()
      ? this.history.slice(-12).map((s) => `${s.speakerLabel}: ${s.text}`).join('\n')
      : this.buffer.flush();
    if (!block) {
      debug.warn('memory', 'force compile skipped: nothing said yet');
      return;
    }
    debug.event('memory', 'force compile (manual)');
    void this.compileMemory(block);
  }

  /** Dev Inspector: generate a sales tactic immediately. */
  forceTactic(): void {
    debug.event('tactic', 'force generate (manual)');
    void this.generateTactic();
  }
}
