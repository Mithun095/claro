"""Real-time (streaming) transcription, approximated over a rolling buffer.

faster-whisper is not a streaming model, so we approximate live transcription:
keep a buffer of recent (not-yet-finalised) audio, re-run the model as new audio
arrives, finalise words that are old enough to be stable (older than a right-edge
margin), and trim finalised audio so each pass stays short. Words within
RIGHT_MARGIN_S of the live edge are shown as a "partial" but not yet committed.
This is the classic right-context approach to streaming Whisper.
"""

from __future__ import annotations

import os
import threading

import numpy as np

from .transcribe import RADIOLOGY_INITIAL_PROMPT, _load_model

SAMPLE_RATE = 16000


def _env_float(name: str, default: float) -> float:
    """Read a float tuning knob from the environment, falling back to default."""
    try:
        return float(os.getenv(name, ""))
    except ValueError:
        return default


# Streaming is a latency/stability trade-off; these are tunable via env so the
# behaviour can be optimised for a given machine without code changes.
# Don't finalise words closer than this to the live edge — they may still change.
RIGHT_MARGIN_S = _env_float("WHISPER_RIGHT_MARGIN_S", 1.0)
# Minimum new audio before another (expensive) model pass.
MIN_STEP_AUDIO_S = _env_float("WHISPER_MIN_STEP_S", 0.5)
# Don't run the model on less than this much buffered audio.
MIN_BUFFER_S = _env_float("WHISPER_MIN_BUFFER_S", 0.8)
# On a pure-silence pass, keep only this much tail so silence can't pile up in
# the buffer and make every later pass slower (a compounding latency spiral).
SILENCE_TAIL_S = 1.0
# faster-whisper VAD speech-probability threshold (0..1). Higher = less sensitive
# to background noise, at the risk of dropping very quiet speech.
VAD_THRESHOLD = _env_float("WHISPER_VAD_THRESHOLD", 0.5)


def streaming_model_name() -> str:
    """The live (streaming) model. Defaults to "base": larger models like medium
    are too slow on CPU to keep up with real-time, so they fall behind and the
    transcript lags further and further. Set WHISPER_STREAMING_MODEL=tiny for even
    lower latency, or =small for better accuracy on a fast machine. The batch
    /transcribe path still uses WHISPER_MODEL."""
    return os.getenv("WHISPER_STREAMING_MODEL", "base")


def get_streaming_model():
    return _load_model(streaming_model_name())


class StreamingTranscriber:
    """Accumulates 16 kHz mono float32 audio and emits committed + partial text.

    Thread-safety: audio is appended from the asyncio event loop while `step()`
    runs in a worker thread, so buffer mutations are guarded by a lock.
    """

    def __init__(self, model):
        self._model = model
        self._lock = threading.Lock()
        self._buf = np.zeros(0, dtype=np.float32)
        self._offset_s = 0.0  # absolute time of buf[0]
        self._committed = ""
        self._committed_until_s = 0.0  # absolute time finalised up to
        self._new_samples = 0  # samples added since the last step()

    def add_audio(self, pcm: np.ndarray) -> None:
        with self._lock:
            self._buf = np.concatenate([self._buf, pcm])
            self._new_samples += len(pcm)

    def new_audio_seconds(self) -> float:
        with self._lock:
            return self._new_samples / SAMPLE_RATE

    def step(self) -> dict | None:
        """Run one model pass; finalise stable words and return {committed, partial}."""
        audio, base = self._snapshot()
        if len(audio) < int(MIN_BUFFER_S * SAMPLE_RATE):
            return None
        words = self._transcribe(audio)
        if not words:
            # No speech this pass (a pause). Drop the accumulated silence so the
            # next pass stays fast; keep a short tail in case speech resumes.
            self._trim_to_tail(SILENCE_TAIL_S)
            return {"committed": self._committed, "partial": ""}

        # Stable prefix = leading words that end before the right-edge margin.
        boundary = len(audio) / SAMPLE_RATE - RIGHT_MARGIN_S  # relative to buffer start
        commit_count = 0
        for _text, _start, end in words:
            if end <= boundary:
                commit_count += 1
            else:
                break

        newly = words[:commit_count]
        if newly:
            self._append_committed(text for text, _s, _e in newly)
            self._committed_until_s = base + newly[-1][2]
            self._trim()

        partial = " ".join(text.strip() for text, _s, _e in words[commit_count:]).strip()
        return {"committed": self._committed, "partial": partial}

    def finalize(self) -> str:
        """Transcribe whatever audio remains and commit all of it."""
        audio, base = self._snapshot()
        if len(audio) >= int(0.2 * SAMPLE_RATE):
            words = self._transcribe(audio)
            if words:
                self._append_committed(text for text, _s, _e in words)
                self._committed_until_s = base + words[-1][2]
        return self._committed.strip()

    # --- internals ---

    def _snapshot(self) -> tuple[np.ndarray, float]:
        with self._lock:
            self._new_samples = 0
            return self._buf.copy(), self._offset_s

    def _transcribe(self, audio: np.ndarray) -> list[tuple[str, float, float]]:
        # Bias the model with radiology vocab plus the tail of committed text.
        prompt = RADIOLOGY_INITIAL_PROMPT
        tail = " ".join(self._committed.split()[-20:])
        if tail:
            prompt = f"{prompt} {tail}"
        segments, _info = self._model.transcribe(
            audio,
            language="en",
            vad_filter=True,
            vad_parameters={"threshold": VAD_THRESHOLD},
            word_timestamps=True,
            condition_on_previous_text=False,
            initial_prompt=prompt,
        )
        words: list[tuple[str, float, float]] = []
        for seg in segments:
            for w in seg.words or []:
                words.append((w.word, w.start, w.end))
        return words

    def _append_committed(self, texts) -> None:
        chunk = " ".join(t.strip() for t in texts).strip()
        if not chunk:
            return
        self._committed = f"{self._committed} {chunk}".strip() if self._committed else chunk

    def _trim(self) -> None:
        # Drop finalised audio so the next pass stays short.
        with self._lock:
            drop = int(round((self._committed_until_s - self._offset_s) * SAMPLE_RATE))
            drop = max(0, min(drop, len(self._buf)))
            if drop:
                self._buf = self._buf[drop:]
                self._offset_s = self._committed_until_s

    def _trim_to_tail(self, keep_s: float) -> None:
        # Keep only the last `keep_s` seconds of buffered audio (used to discard
        # silence). Safe because nothing dropped here has been committed.
        with self._lock:
            drop = len(self._buf) - int(keep_s * SAMPLE_RATE)
            if drop > 0:
                self._buf = self._buf[drop:]
                self._offset_s += drop / SAMPLE_RATE
