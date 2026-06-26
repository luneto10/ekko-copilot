import {
  IPC,
  type AudioSource,
  type IpcChannel,
  type SpeakerId,
  type TranscriptSegment,
  type WorkIqResponse,
} from '@workiq/types';
import { SourceRecognizer } from '../speech/SourceRecognizer';
import { isSpeechConfigured, env } from '../env';
import { RollingBuffer } from './RollingBuffer';
import { MemoryCompiler } from './MemoryCompiler';
import { createKeyPointDetector, type KeyPointDetector, type DetectedKeyPoint } from './KeyPointDetector';
import { INITIAL_MEMORY } from './prompts';
import { createWorkIqClient, type WorkIqClient } from '../workiq/WorkIqClient';
import { debug } from '../debug/DebugBus';

type Emit = (channel: IpcChannel, payload: unknown) => void;

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
  private readonly keyPointDetector: KeyPointDetector = createKeyPointDetector();
  private readonly workIq: WorkIqClient;

  private micRecognizer: SourceRecognizer | null = null;
  private systemRecognizer: SourceRecognizer | null = null;
  /** Whether the rep is actively listening (informational; tactics are event-driven). */
  private active = false;

  private memoryMarkdown = INITIAL_MEMORY;
  private history: TranscriptSegment[] = [];
  private compiling = false;
  /** Topics already raised this call, fed to the detector so it reuses labels. */
  private readonly knownTopics: string[] = [];
  /** Latest grounded Work IQ answer per topic, fed to tactics so they cite real facts. */
  private readonly groundedFacts = new Map<string, string>();
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
    this.emit(IPC.MemoryUpdate, { markdown: this.memoryMarkdown, updatedAt: Date.now() });
  }

  stop(): void {
    this.micRecognizer?.close();
    this.systemRecognizer?.close();
  }

  /**
   * Mark the rep as listening (or not). While inactive, the orchestrator stops
   * pushing new Wolf Tactics so they don't keep popping after the call ends.
   */
  setActive(active: boolean): void {
    this.active = active;
    debug.gauge('orchestrator.active', active);
  }

  /** Feed PCM from the renderer's audio capture into the right recognizer. */
  pushAudio(source: AudioSource, buffer: ArrayBuffer): void {
    if (source === 'mic') this.micRecognizer?.write(buffer);
    else this.systemRecognizer?.write(buffer);
  }

  /**
   * Answer a free-form follow-up question through the SAME Work IQ client that
   * grounds key notes, so per-pill chat uses real data (Copilot Retrieval /
   * Search) instead of a separate mock.
   */
  async ask(question: string, topic: string): Promise<WorkIqResponse> {
    return this.workIq.query(question, topic);
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

    // COLD path: only trigger on a customer line; the AI decides if it's a
    // groundable key point (no predefined intents).
    if (segment.speaker === 'Speaker_2') {
      void this.detectKeyPoint(segment.text);
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
      // A fresh memory = a fresh, smarter tactic. Event-driven (not on a timer),
      // so tactics only appear on new conversation and stop when it ends.
      void this.generateTactic();
    } catch (err) {
      debug.error('memory', 'compile failed', { error: String(err) });
    } finally {
      this.compiling = false;
    }
  }

  private async runWorkIq(topic: string, query: string): Promise<void> {
    this.emit(IPC.WorkIqStatus, { query, isSearching: true, topic });
    debug.count('workiq.calls');
    debug.event('workiq', `query → "${query}"`, { topic });
    const started = Date.now();
    try {
      const result = await this.workIq.query(query, topic);
      const ms = Date.now() - started;
      debug.gauge('workiq.lastMs', ms);
      debug.event('workiq', `result in ${ms}ms`, { answer: result.answer, sources: result.sources });
      this.emit(IPC.WorkIqResult, { ...result, topic });
      // Grounding just landed: cache the fact and refresh the tactic so it can
      // cite the real number instead of inventing one.
      if (result.answer.trim()) {
        this.groundedFacts.set(topic, result.answer.trim());
        void this.generateTactic();
      }
    } catch (err) {
      debug.error('workiq', 'query failed', { error: String(err) });
    } finally {
      this.emit(IPC.WorkIqStatus, { query, isSearching: false, topic });
    }
  }

  /**
   * COLD path: ask the key-point detector whether this customer line is worth
   * grounding, then run Work IQ on the topic it named. Never awaited on the hot
   * path, so transcription stays real-time.
   */
  private async detectKeyPoint(utterance: string): Promise<void> {
    const context = this.history
      .slice(-6)
      .map((s) => `${s.speakerLabel}: ${s.text}`)
      .join('\n');
    let point: DetectedKeyPoint | null;
    try {
      point = await this.keyPointDetector.detect(utterance, context, this.knownTopics);
    } catch (err) {
      debug.error('intent', 'key-point detection failed', { error: String(err) });
      return;
    }
    if (!point) return;
    if (!this.knownTopics.some((t) => t.toLowerCase() === point.topic.toLowerCase())) {
      this.knownTopics.push(point.topic);
    }
    debug.count('intents');
    debug.event('intent', `Key point: ${point.topic}`, { topic: point.topic, query: point.query });
    void this.runWorkIq(point.topic, point.query);

    // A customer key point is a coaching moment: refresh memory now (which also
    // emits a fresh tactic) instead of waiting for the word threshold.
    if (!this.compiling && !this.buffer.isEmpty()) {
      void this.compileMemory(this.buffer.flush());
    }
  }

  private async generateTactic(): Promise<void> {
    if (this.history.length === 0) return;
    const recent = this.history
      .slice(-8)
      .map((s) => `${s.speakerLabel}: ${s.text}`)
      .join('\n');
    try {
      const text = await this.memoryCompiler.tactic(
        this.memoryMarkdown,
        recent,
        this.recentGroundedFacts(),
      );
      if (text) {
        debug.count('tactics');
        debug.event('tactic', text);
        this.emit(IPC.CopilotTactic, { text, kind: 'tactic', ts: Date.now() });
      }
    } catch (err) {
      debug.error('tactic', 'generation failed', { error: String(err) });
    }
  }

  /** Compact, most-recent grounded facts to anchor tactics in real data. */
  private recentGroundedFacts(): string {
    return [...this.groundedFacts.entries()]
      .slice(-4)
      .map(([topic, answer]) => `- ${topic}: ${answer}`)
      .join('\n');
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
