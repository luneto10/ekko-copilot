import { useCallback, useRef, useState } from 'react';
import type { AudioSource } from '@workiq/types';
import { bridge } from '@/shared/bridge';

/**
 * URL of the AudioWorklet processor, resolved relative to the document so it
 * works both in dev (http://127.0.0.1:5173) and in a packaged build (file://).
 * The file lives in `public/pcm-worklet.js`.
 */
const WORKLET_URL = new URL('pcm-worklet.js', document.baseURI).href;

interface Pipeline {
  ctx: AudioContext;
  stream: MediaStream;
}

/**
 * Capture hook for the "hot path".
 *
 * Captures the microphone (sales rep) **and** the system loopback (remote
 * customer), downsamples each to 16 kHz / 16-bit / mono PCM inside an
 * AudioWorklet, and streams the chunks to the main process over IPC.
 *
 * Must be started from a user gesture (the Start button) because
 * `getDisplayMedia` requires transient activation.
 *
 * @returns `{ isListening, error, start, stop }` for the header control.
 */
export function useAudioCapture() {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pipelinesRef = useRef<Pipeline[]>([]);

  /** Wire one MediaStream → 16 kHz AudioContext → worklet → IPC. */
  const buildPipeline = useCallback(async (stream: MediaStream, source: AudioSource) => {
    const ctx = new AudioContext({ sampleRate: 16000 });
    await ctx.audioWorklet.addModule(WORKLET_URL);
    const sourceNode = ctx.createMediaStreamSource(stream);
    const workletNode = new AudioWorkletNode(ctx, 'pcm-worklet');
    workletNode.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
      bridge.sendChunk(source, event.data);
    };
    // A muted gain keeps the graph "pulling" without echoing audio to speakers.
    const silentGain = ctx.createGain();
    silentGain.gain.value = 0;
    sourceNode.connect(workletNode).connect(silentGain).connect(ctx.destination);
    pipelinesRef.current.push({ ctx, stream });
  }, []);

  /** Acquire mic + loopback streams and begin streaming PCM. */
  const start = useCallback(async () => {
    setError(null);
    try {
      const mic = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      await buildPipeline(mic, 'mic');

      // System loopback (remote participant). Granted silently by the main
      // process's setDisplayMediaRequestHandler — the video track is discarded.
      const display = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: true });
      display.getVideoTracks().forEach((track) => track.stop());
      const systemAudio = new MediaStream(display.getAudioTracks());
      if (systemAudio.getAudioTracks().length > 0) {
        await buildPipeline(systemAudio, 'system');
      }

      bridge.startAudio();
      setIsListening(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setIsListening(false);
    }
  }, [buildPipeline]);

  /** Tear down every pipeline and stop all tracks. */
  const stop = useCallback(() => {
    for (const { ctx, stream } of pipelinesRef.current) {
      stream.getTracks().forEach((track) => track.stop());
      void ctx.close();
    }
    pipelinesRef.current = [];
    bridge.stopAudio();
    setIsListening(false);
  }, []);

  return { isListening, error, start, stop };
}
