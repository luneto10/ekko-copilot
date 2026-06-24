import type { TranscriptSegment } from '@workiq/types';

/**
 * Accumulates finalized utterances until a flush is warranted. A flush happens
 * when the buffer crosses a word threshold AND a finalized sentence has just
 * landed (a natural conversational pause).
 */
export class RollingBuffer {
  private segments: TranscriptSegment[] = [];

  add(segment: TranscriptSegment): void {
    this.segments.push(segment);
  }

  wordCount(): number {
    return this.segments.reduce(
      (total, s) => total + s.text.trim().split(/\s+/).filter(Boolean).length,
      0,
    );
  }

  isEmpty(): boolean {
    return this.segments.length === 0;
  }

  /** Drain the buffer into a single labeled transcript block. */
  flush(): string {
    const block = this.segments.map((s) => `${s.speakerLabel}: ${s.text}`).join('\n');
    this.segments = [];
    return block;
  }
}
