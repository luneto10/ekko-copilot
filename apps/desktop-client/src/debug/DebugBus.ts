import type { WebContents } from 'electron';
import {
  IPC,
  type DebugEvent,
  type DebugLevel,
  type DebugMetrics,
  type DebugSnapshot,
} from '@workiq/types';

const RING_CAPACITY = 600;

/**
 * Central diagnostics hub for the main process. Every interesting thing the
 * pipeline does is funneled here: it keeps a ring buffer of structured events
 * plus counters/gauges, mirrors everything to the console, and (when a Dev
 * Inspector window is attached) streams events live + a 1 Hz metrics snapshot.
 *
 * Singleton (`debug`) so any module can import and log without plumbing.
 */
class DebugBus {
  private ring: DebugEvent[] = [];
  private seq = 0;
  private counters: Record<string, number> = {};
  private gauges: Record<string, number | string | boolean> = {};
  private sink: WebContents | null = null;
  private metricsTimer: NodeJS.Timeout | null = null;

  /** Point the bus at the Dev Inspector window and backfill its history. */
  attach(webContents: WebContents): void {
    this.sink = webContents;
    this.send(IPC.DebugInit, this.snapshot());
    if (!this.metricsTimer) {
      this.metricsTimer = setInterval(() => this.send(IPC.DebugMetrics, this.metricsSnapshot()), 1000);
    }
  }

  detach(): void {
    this.sink = null;
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = null;
    }
  }

  log(level: DebugLevel, category: string, message: string, data?: unknown): void {
    const event: DebugEvent = { id: ++this.seq, ts: Date.now(), level, category, message, data };
    this.ring.push(event);
    if (this.ring.length > RING_CAPACITY) this.ring.shift();

    const tag = `[${category}]`;
    if (level === 'error') console.error(tag, message, data ?? '');
    else if (level === 'warn') console.warn(tag, message, data ?? '');
    else console.log(tag, message, data ?? '');

    this.send(IPC.DebugEvent, event);
  }

  event(category: string, message: string, data?: unknown): void {
    this.log('event', category, message, data);
  }
  info(category: string, message: string, data?: unknown): void {
    this.log('info', category, message, data);
  }
  warn(category: string, message: string, data?: unknown): void {
    this.log('warn', category, message, data);
  }
  error(category: string, message: string, data?: unknown): void {
    this.log('error', category, message, data);
  }

  count(key: string, amount = 1): void {
    this.counters[key] = (this.counters[key] ?? 0) + amount;
  }
  gauge(key: string, value: number | string | boolean): void {
    this.gauges[key] = value;
  }

  /** Wipe the event log + counters (keeps gauges, which are status). */
  clear(): void {
    this.ring = [];
    this.counters = {};
    this.send(IPC.DebugInit, this.snapshot());
  }

  private snapshot(): DebugSnapshot {
    return { events: [...this.ring], metrics: this.metricsSnapshot() };
  }

  private metricsSnapshot(): DebugMetrics {
    return { counters: { ...this.counters }, gauges: { ...this.gauges }, ts: Date.now() };
  }

  private send(channel: string, payload: unknown): void {
    if (this.sink && !this.sink.isDestroyed()) this.sink.send(channel, payload);
  }
}

export const debug = new DebugBus();
