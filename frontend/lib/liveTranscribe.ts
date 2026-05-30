// Live (streaming) transcription. Captures mic audio, resamples it to 16 kHz
// mono PCM in an AudioWorklet, streams it to the backend over a WebSocket, and
// surfaces incremental {committed, partial} updates as the doctor speaks.
//
// Browser-only: this module touches getUserMedia, AudioContext, AudioWorklet and
// WebSocket, so it is imported solely from the Recorder client component.

import { wsUrl } from "./api";

// The backend (streaming.py) expects 16 kHz mono Int16 PCM. We fix the
// AudioContext rate so the browser resamples the mic for us — no manual resample.
const SAMPLE_RATE = 16000;
// Served statically from frontend/public.
const WORKLET_URL = "/pcm-recorder-worklet.js";
// If the socket dies before sending "final", fall back to the last committed text.
const FINALIZE_TIMEOUT_MS = 15000;

// Noise gate: don't stream frames quieter than this RMS (0..1). Quiet room noise
// sits well below ~0.01 while speech is far above it, so this stops the model
// from hallucinating words on background noise. Raise it if a noisy room still
// leaks through; lower it if quiet speech gets dropped.
const NOISE_GATE_RMS = 0.012;
// Keep streaming briefly after the level drops below the gate so word endings and
// short inter-word gaps aren't clipped.
const GATE_HANGOVER_MS = 600;
// When the gate opens, also send the few frames just before it (the word's onset
// ramps up through the threshold), so the first syllable isn't cut off.
const PREROLL_FRAMES = 2;

/** Root-mean-square level of a frame, used as a cheap voice/noise discriminator. */
function rms(samples: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
  return Math.sqrt(sum / samples.length);
}

export interface LiveUpdate {
  /** Text finalised so far (stable). */
  committed: string;
  /** In-progress words near the live edge; may still change. */
  partial: string;
}

export interface LiveSession {
  /** Stop capture, flush the backend, and resolve with the final transcript. */
  stop: () => Promise<string>;
}

interface StartOptions {
  /** Called on every incremental update from the backend. */
  onUpdate: (update: LiveUpdate) => void;
  /** Called if the connection drops unexpectedly mid-recording. */
  onError?: (error: Error) => void;
}

type ServerMessage =
  | { type: "update"; committed: string; partial: string }
  | { type: "final"; text: string };

/** Convert Float32 samples (-1..1) to a 16-bit little-endian PCM buffer ready to
 *  send over the socket. Returns a concrete ArrayBuffer (not a shared one). */
function floatToPcm16(samples: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(samples.length * Int16Array.BYTES_PER_ELEMENT);
  const view = new Int16Array(buffer);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return buffer;
}

export async function startLiveTranscription({
  onUpdate,
  onError,
}: StartOptions): Promise<LiveSession> {
  // 1. Open the socket first so we fail fast (and before prompting for the mic)
  //    if the backend isn't reachable.
  const socket = new WebSocket(wsUrl("/ws/transcribe"));
  socket.binaryType = "arraybuffer";
  await new Promise<void>((resolve, reject) => {
    socket.addEventListener("open", () => resolve(), { once: true });
    socket.addEventListener(
      "error",
      () => reject(new Error("Could not reach the transcription service. Is the backend running?")),
      { once: true },
    );
  });

  let lastCommitted = "";
  let stopping = false;
  let resolveFinal: ((text: string) => void) | null = null;

  socket.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data as string) as ServerMessage;
    if (msg.type === "update") {
      lastCommitted = msg.committed;
      onUpdate({ committed: msg.committed, partial: msg.partial });
    } else if (msg.type === "final") {
      resolveFinal?.(msg.text);
      resolveFinal = null;
    }
  });

  socket.addEventListener("close", () => {
    if (resolveFinal) {
      // Closed while we were waiting for the final transcript: use what we have.
      resolveFinal(lastCommitted);
      resolveFinal = null;
    } else if (!stopping) {
      onError?.(new Error("Connection to the transcription service was lost."));
    }
  });

  // 2. Capture the mic. Mono + 16 kHz keeps the stream small and matches the
  //    backend. Echo + noise suppression clean up the dictation; auto gain is
  //    OFF so the browser doesn't crank up the gain in quiet moments and amplify
  //    background noise (which makes the mic feel "too sensitive").
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: false,
      },
    });
  } catch {
    socket.close();
    throw new Error("Microphone access was denied or is unavailable.");
  }

  const audioCtx = new AudioContext({ sampleRate: SAMPLE_RATE });
  await audioCtx.audioWorklet.addModule(WORKLET_URL);
  const source = audioCtx.createMediaStreamSource(stream);
  const recorder = new AudioWorkletNode(audioCtx, "pcm-recorder");

  // The worklet posts ~2048-sample Float32 frames. Gate out background noise so
  // only speech reaches the model, then convert and stream it.
  let lastVoiceAt = 0;
  let gateOpen = false;
  const preroll: Float32Array[] = [];

  recorder.port.onmessage = (event: MessageEvent<Float32Array>) => {
    if (socket.readyState !== WebSocket.OPEN) return;
    const samples = event.data;
    const now = performance.now();
    if (rms(samples) >= NOISE_GATE_RMS) lastVoiceAt = now;

    if (now - lastVoiceAt <= GATE_HANGOVER_MS) {
      if (!gateOpen) {
        // Gate just opened — flush the pre-roll so the onset isn't clipped.
        for (const frame of preroll) socket.send(floatToPcm16(frame));
        preroll.length = 0;
        gateOpen = true;
      }
      socket.send(floatToPcm16(samples));
    } else {
      // Below the gate: hold a short rolling pre-roll instead of streaming.
      gateOpen = false;
      preroll.push(samples);
      if (preroll.length > PREROLL_FRAMES) preroll.shift();
    }
  };

  source.connect(recorder);
  // Connect to the destination so the render graph keeps pulling the worklet.
  // The worklet writes no output, so this plays silence (no mic echo).
  recorder.connect(audioCtx.destination);

  async function stop(): Promise<string> {
    stopping = true;
    // Stop capturing audio and release the mic.
    recorder.port.onmessage = null;
    source.disconnect();
    recorder.disconnect();
    stream.getTracks().forEach((track) => track.stop());
    await audioCtx.close();

    if (socket.readyState !== WebSocket.OPEN) return lastCommitted;

    // Ask the backend to transcribe the tail and send the final transcript.
    const finalText = new Promise<string>((resolve) => {
      resolveFinal = resolve;
      setTimeout(() => {
        if (resolveFinal) {
          resolveFinal(lastCommitted);
          resolveFinal = null;
        }
      }, FINALIZE_TIMEOUT_MS);
    });
    socket.send(JSON.stringify({ type: "stop" }));
    const text = await finalText;
    socket.close();
    return text;
  }

  return { stop };
}
