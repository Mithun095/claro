"""Tests for the swappable LLM interface (Task 3).

These mock the Ollama client so they run fast and without a live server.
"""

from app import llm


class _FakeClient:
    def __init__(self):
        self.calls = []

    def generate(self, model, prompt, options, stream):
        self.calls.append(
            {"model": model, "prompt": prompt, "options": options, "stream": stream}
        )
        return {"response": "  Hello, doctor.  "}


def test_llm_complete_returns_stripped_text(monkeypatch):
    fake = _FakeClient()
    monkeypatch.setattr(llm, "_client", lambda: fake)
    out = llm.llm_complete("Say hello")
    assert out == "Hello, doctor."
    assert fake.calls[0]["prompt"] == "Say hello"
    assert fake.calls[0]["stream"] is False


def test_llm_complete_uses_env_model(monkeypatch):
    fake = _FakeClient()
    monkeypatch.setattr(llm, "_client", lambda: fake)
    monkeypatch.setenv("OLLAMA_MODEL", "qwen2.5:3b")
    llm.llm_complete("hi")
    assert fake.calls[0]["model"] == "qwen2.5:3b"


def test_extract_text_handles_object_response():
    class _Resp:
        response = "  hi  "

    assert llm._extract_text(_Resp()) == "hi"
