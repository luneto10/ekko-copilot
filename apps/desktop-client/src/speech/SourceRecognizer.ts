import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import type { SpeakerId, TranscriptSegment } from '@workiq/types';
import { env } from '../env';
import { debug } from '../debug/DebugBus';

type SegmentHandler = (segment: TranscriptSegment) => void;

/**
 * One continuous Azure Speech recognizer bound to a single audio source.
 * Because the microphone (sales rep) and the system loopback (customer) are
 * physically separate streams, attributing the speaker by source is fully
 * deterministic — no blind diarization required.
 */
export class SourceRecognizer {
  private pushStream!: sdk.PushAudioInputStream;
  private recognizer!: sdk.SpeechRecognizer;
  private closed = false;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly speaker: SpeakerId,
    private readonly speakerLabel: string,
    private readonly onSegment: SegmentHandler,
  ) {
    this.connect();
  }

  /** (Re)establish a fresh push stream + recognizer and start listening. */
  private connect(): void {
    const speechConfig = sdk.SpeechConfig.fromSubscription(env.speechKey, env.speechRegion);
    speechConfig.speechRecognitionLanguage = 'en-US';

    const format = sdk.AudioStreamFormat.getWaveFormatPCM(16000, 16, 1);
    const pushStream = sdk.AudioInputStream.createPushStream(format);
    const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);
    const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

    recognizer.recognizing = (_s, e) => {
      if (e.result.text) this.emit(e.result.text, false);
    };
    recognizer.recognized = (_s, e) => {
      if (e.result.reason === sdk.ResultReason.RecognizedSpeech && e.result.text) {
        this.emit(e.result.text, true);
      }
    };
    recognizer.sessionStarted = () => {
      this.reconnectAttempts = 0;
      debug.info('speech', `${this.speakerLabel} connected`);
    };
    recognizer.canceled = (_s, e) => {
      if (e.reason === sdk.CancellationReason.Error) {
        debug.error('speech', `${this.speakerLabel} error: ${e.errorDetails ?? e.reason}`);
        this.scheduleReconnect();
      }
    };

    // Swap references in before starting so write() never targets a dead stream.
    this.pushStream = pushStream;
    this.recognizer = recognizer;

    recognizer.startContinuousRecognitionAsync(
      () => debug.info('speech', `${this.speakerLabel} listening`),
      (err) => {
        debug.error('speech', `${this.speakerLabel} start failed: ${err}`);
        this.scheduleReconnect();
      },
    );
  }

  /** Exponential backoff reconnect on transient network/DNS errors. */
  private scheduleReconnect(): void {
    if (this.closed || this.reconnectTimer) return;
    const delay = Math.min(15_000, 1000 * 2 ** this.reconnectAttempts);
    this.reconnectAttempts += 1;
    debug.warn(
      'speech',
      `${this.speakerLabel} reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`,
    );
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.closed) return;
      try {
        this.recognizer?.close();
      } catch {
        /* ignore teardown errors */
      }
      this.connect();
    }, delay);
  }

  private emit(text: string, isFinal: boolean): void {
    this.onSegment({
      speaker: this.speaker,
      speakerLabel: this.speakerLabel,
      text,
      isFinal,
      ts: Date.now(),
    });
  }

  /** Feed 16 kHz / 16-bit / mono PCM into the recognizer. */
  write(buffer: ArrayBuffer): void {
    try {
      this.pushStream.write(buffer);
    } catch {
      // Stream may be briefly unavailable mid-reconnect; drop the chunk.
    }
  }

  close(): void {
    this.closed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.recognizer.stopContinuousRecognitionAsync(
      () => this.pushStream.close(),
      () => this.pushStream.close(),
    );
  }
}
