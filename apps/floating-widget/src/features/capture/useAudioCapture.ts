import { useCallback, useRef, useState } from 'react';
import type { AudioSource } from '@workiq/types';
import { bridge } from '@/shared/bridge';

const WORKLET_URL = new URL('pcm-worklet.js', document.baseURI).href;

interface Pipeline {
  ctx: AudioContext;
  stream: MediaStream;
}

export function useAudioCapture() {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pipelinesRef = useRef<Pipeline[]>([]);

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

  const start = useCallback(async () => {
    setError(null);
    try {
      const mic = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      await buildPipeline(mic, 'mic');

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
