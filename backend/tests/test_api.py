"""Tests for the backend (Task 1 health routes + Task 2 /transcribe).

Route-level tests stub out the STT engine so they run fast and deterministically.
A real-model integration test is included but skipped unless
RUN_WHISPER_INTEGRATION=1 is set (it loads the Whisper model and is slow).
"""

import math
import os
import struct
import wave

import pytest
from fastapi.testclient import TestClient

from app import main, transcribe
from app.main import app

client = TestClient(app)


def test_root_ok():
    r = client.get("/")
    assert r.status_code == 200
    assert r.json() == {"service": "radiology-ai-scribe", "status": "ok"}


def test_health_ok():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_transcribe_requires_file():
    # No multipart file -> FastAPI validation error.
    assert client.post("/transcribe").status_code == 422


def test_transcribe_returns_transcript(monkeypatch):
    monkeypatch.setattr(main, "transcribe_audio", lambda path: "liver is enlarged")
    r = client.post("/transcribe", files={"file": ("clip.wav", b"RIFFxxxx", "audio/wav")})
    assert r.status_code == 200
    assert r.json() == {"transcript": "liver is enlarged"}


def test_transcribe_engine_error_returns_500(monkeypatch):
    def boom(path):
        raise RuntimeError("decode failed")

    monkeypatch.setattr(main, "transcribe_audio", boom)
    r = client.post("/transcribe", files={"file": ("clip.wav", b"bad", "audio/wav")})
    assert r.status_code == 500
    assert "decode failed" in r.json()["detail"]


def test_transcribe_cleans_up_temp_file(monkeypatch):
    seen = {}

    def fake(path):
        seen["path"] = path
        assert os.path.exists(path), "temp file should exist during transcription"
        return "ok"

    monkeypatch.setattr(main, "transcribe_audio", fake)
    r = client.post("/transcribe", files={"file": ("clip.wav", b"x", "audio/wav")})
    assert r.status_code == 200
    assert not os.path.exists(seen["path"]), "temp file should be removed afterwards"


def test_transcribe_audio_joins_and_strips_segments(monkeypatch):
    class _Seg:
        def __init__(self, text):
            self.text = text

    class _FakeModel:
        def transcribe(self, path, **kwargs):
            return ([_Seg("  Liver is enlarged. "), _Seg(" Spleen is normal. ")], object())

    monkeypatch.setattr(transcribe, "_get_model", lambda: _FakeModel())
    assert transcribe.transcribe_audio("x.wav") == "Liver is enlarged. Spleen is normal."


@pytest.mark.skipif(
    not os.getenv("RUN_WHISPER_INTEGRATION"),
    reason="loads the real Whisper model (slow); set RUN_WHISPER_INTEGRATION=1 to run",
)
def test_real_model_on_generated_clip(tmp_path):
    wav = tmp_path / "tone.wav"
    sr, dur = 16000, 2
    with wave.open(str(wav), "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(
            b"".join(
                struct.pack("<h", int(3000 * math.sin(2 * math.pi * 220 * t / sr)))
                for t in range(sr * dur)
            )
        )
    with open(wav, "rb") as f:
        r = client.post("/transcribe", files={"file": ("tone.wav", f, "audio/wav")})
    assert r.status_code == 200
    assert isinstance(r.json()["transcript"], str)
