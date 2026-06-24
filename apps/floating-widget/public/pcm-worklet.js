// AudioWorklet processor: converts Float32 input to 16-bit PCM and posts ~100ms
// batches back to the main thread to keep IPC traffic low. Runs in the audio
// render thread (loaded via audioContext.audioWorklet.addModule). Plain JS — not
// bundled by Vite (served from /public as-is).
class PcmWorklet extends AudioWorkletProcessor {
  constructor() {
    super();
    this._chunks = [];
    this._count = 0;
    this._target = 1600; // 100 ms at 16 kHz
  }

  process(inputs) {
    const input = inputs[0];
    if (input && input[0]) {
      const channel = input[0]; // Float32Array, 128 frames
      const pcm = new Int16Array(channel.length);
      for (let i = 0; i < channel.length; i++) {
        const s = Math.max(-1, Math.min(1, channel[i]));
        pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      this._chunks.push(pcm);
      this._count += pcm.length;

      if (this._count >= this._target) {
        const out = new Int16Array(this._count);
        let offset = 0;
        for (const chunk of this._chunks) {
          out.set(chunk, offset);
          offset += chunk.length;
        }
        this._chunks = [];
        this._count = 0;
        this.port.postMessage(out.buffer, [out.buffer]);
      }
    }
    return true;
  }
}

registerProcessor('pcm-worklet', PcmWorklet);
