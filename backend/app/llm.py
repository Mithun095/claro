"""The single, swappable LLM interface (CLAUDE.md hard rule #3).

Every LLM call in the app goes through `llm_complete(prompt) -> str`. Today it
talks to a local Ollama model; to swap to a hosted API later, change only this
file — callers must never import Ollama (or any provider) directly.
"""

from __future__ import annotations

import os
from functools import lru_cache

from ollama import Client

DEFAULT_MODEL = "llama3.1:8b"


def model_name() -> str:
    """The configured Ollama model (override with the OLLAMA_MODEL env var)."""
    return os.getenv("OLLAMA_MODEL", DEFAULT_MODEL)


@lru_cache(maxsize=1)
def _client() -> Client:
    # OLLAMA_HOST defaults to http://localhost:11434; keep it configurable here.
    return Client(host=os.getenv("OLLAMA_HOST", "http://localhost:11434"))


def _extract_text(response: object) -> str:
    """Pull the completion text out of an Ollama generate() response.

    The client returns a typed object exposing `.response`; we fall back to dict
    access for forward/backward compatibility across client versions.
    """
    text = getattr(response, "response", None)
    if text is None and isinstance(response, dict):
        text = response.get("response")
    return (text or "").strip()


def llm_complete(prompt: str) -> str:
    """Send a prompt to the local LLM and return its text completion.

    This is the ONLY place the LLM is invoked.
    """
    # Low temperature: this is a medical scribe, so we want faithful, low-variance
    # output rather than creative text. Configurable via OLLAMA_TEMPERATURE.
    temperature = float(os.getenv("OLLAMA_TEMPERATURE", "0.2"))
    response = _client().generate(
        model=model_name(),
        prompt=prompt,
        options={"temperature": temperature},
        stream=False,
    )
    return _extract_text(response)
