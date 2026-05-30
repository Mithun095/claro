"""Tests for streaming transcription (the /ws/transcribe feature).

The model is faked with scripted word lists so the commit/partial logic and the
WebSocket protocol are tested deterministically, without real inference.
"""

import json

import numpy as np

from fastapi.testclient import TestClient

from app import main, streaming
from app.main import app


class _Word:
    def __init__(self, word, start, end):
        self.word, self.start, self.end = word, start, end


class _Segment:
    def __init__(self, words):
        self.words = words


class _FakeModel:
    """Returns the next scripted list of words on each transcribe() call."""

    def __init__(self, scripts):
        self.scripts = scripts
        self.calls = 0

    def transcribe(self, audio, **kwargs):
        words = self.scripts[min(self.calls, len(self.scripts) - 1)]
        self.calls += 1
        return ([_Segment(words)], object())


def _seconds(n: float) -> np.ndarray:
    return np.zeros(int(n * streaming.SAMPLE_RATE), dtype=np.float32)


def test_step_commits_stable_words_and_keeps_tail():
    # 3s buffer -> right-edge boundary at 3.0 - RIGHT_MARGIN_S (1.0) = 2.0s.
    model = _FakeModel([[_Word(" hello", 0.0, 0.4), _Word(" world", 0.6, 1.0), _Word(" foo", 2.0, 2.4)]])
    t = streaming.StreamingTranscriber(model)
    t.add_audio(_seconds(3.0))
    out = t.step()
    assert out == {"committed": "hello world", "partial": "foo"}


def test_step_returns_none_when_too_little_audio():
    t = streaming.StreamingTranscriber(_FakeModel([[]]))
    t.add_audio(_seconds(0.5))  # below MIN_BUFFER_S
    assert t.step() is None


def test_step_commits_nothing_when_all_words_near_edge():
    # 2s buffer, boundary at 2.0 - 1.0 = 1.0s; both words end after it -> all partial.
    model = _FakeModel([[_Word(" left", 0.7, 1.1), _Word(" right", 1.2, 1.8)]])
    t = streaming.StreamingTranscriber(model)
    t.add_audio(_seconds(2.0))
    out = t.step()
    assert out == {"committed": "", "partial": "left right"}


def test_finalize_commits_remaining():
    model = _FakeModel([[_Word(" tail", 0.0, 0.5)]])
    t = streaming.StreamingTranscriber(model)
    t.add_audio(_seconds(1.0))
    assert t.finalize() == "tail"


def test_ws_streaming_sends_final(monkeypatch):
    model = _FakeModel([
        [_Word(" hello", 0.0, 0.4)],                          # step()
        [_Word(" hello", 0.0, 0.4), _Word(" world", 0.6, 1.0)],  # finalize()
    ])
    monkeypatch.setattr(main, "get_streaming_model", lambda: model)

    client = TestClient(app)
    with client.websocket_connect("/ws/transcribe") as ws:
        ws.send_bytes(np.zeros(int(2.0 * 16000), dtype=np.int16).tobytes())
        ws.send_text(json.dumps({"type": "stop"}))
        messages = []
        while True:
            msg = ws.receive_json()
            messages.append(msg)
            if msg["type"] == "final":
                break

    assert messages[-1]["type"] == "final"
    assert isinstance(messages[-1]["text"], str)
