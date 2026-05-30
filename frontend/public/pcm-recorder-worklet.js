// AudioWorklet processor: buffers mono Float32 samples and posts ~2048-sample
// frames to the main thread, which converts them to 16-bit PCM and streams them
// to the backend over a WebSocket. Runs off the main thread.
class PCMRecorder extends AudioWorkletProcessor {
  constructor() {
    super();
    this._chunks = [];
    this._length = 0;
    this._target = 2048;
  }

  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (channel && channel.length) {
      this._chunks.push(channel.slice(0));
      this._length += channel.length;
      if (this._length >= this._target) {
        const merged = new Float32Array(this._length);
        let offset = 0;
        for (const c of this._chunks) {
          merged.set(c, offset);
          offset += c.length;
        }
        this.port.postMessage(merged, [merged.buffer]);
        this._chunks = [];
        this._length = 0;
      }
    }
    return true; // keep processor alive
  }
}

registerProcessor("pcm-recorder", PCMRecorder);
