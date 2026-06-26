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

export class Orchestrator {
  private readonly emit: Emit;
  private readonly buffer = new RollingBuffer();
  private readonly memoryCompiler = new MemoryCompiler();
  private readonly keyPointDetector: KeyPointDetector = createKeyPointDetector();
  private readonly workIq: WorkIqClient;

  private micRecognizer: SourceRecognizer | null = null;
  private systemRecognizer: SourceRecognizer | null = null;

  private memoryMarkdown = INITIAL_MEMORY;
  private history: TranscriptSegment[] = [];
  private compiling = false;
  private readonly knownTopics: string[] = [];
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

  setActive(active: boolean): void {
    debug.gauge('orchestrator.active', active);
  }

  pushAudio(source: AudioSource, buffer: ArrayBuffer): void {
    if (source === 'mic') this.micRecognizer?.write(buffer);
    else this.systemRecognizer?.write(buffer);
  }

  async ask(question: string, topic: string): Promise<WorkIqResponse> {
    return this.workIq.query(question, topic);
  }

  private handleSegment(segment: TranscriptSegment): void {
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

    if (segment.speaker === 'Speaker_2') {
      void this.detectKeyPoint(segment.text);
    }

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
    debug.event('workiq', `query: "${query}"`, { topic });
    const started = Date.now();
    try {
      const result = await this.workIq.query(query, topic);
      const ms = Date.now() - started;
      debug.gauge('workiq.lastMs', ms);
      debug.event('workiq', `result in ${ms}ms`, { answer: result.answer, sources: result.sources });
      this.emit(IPC.WorkIqResult, { ...result, topic });
      if (result.answer.trim()) {
        this.groundedFacts.delete(topic);
        this.groundedFacts.set(topic, result.answer.trim());
        void this.generateTactic();
      }
    } catch (err) {
      debug.error('workiq', 'query failed', { error: String(err) });
    } finally {
      this.emit(IPC.WorkIqStatus, { query, isSearching: false, topic });
    }
  }

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

  private recentGroundedFacts(): string {
    return [...this.groundedFacts.entries()]
      .slice(-4)
      .map(([topic, answer]) => `- ${topic}: ${answer}`)
      .join('\n');
  }

  injectTranscript(speaker: SpeakerId, text: string): void {
    const speakerLabel = speaker === 'Speaker_1' ? 'Sales Rep' : 'Customer';
    debug.event('test', `injected ${speakerLabel}: ${text}`, { speaker });
    this.handleSegment({ speaker, speakerLabel, text, isFinal: true, ts: Date.now() });
  }

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

  forceTactic(): void {
    debug.event('tactic', 'force generate (manual)');
    void this.generateTactic();
  }
}
