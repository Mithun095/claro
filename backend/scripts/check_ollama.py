"""Quick manual check that the local Ollama LLM is reachable and responding.

Run from the backend directory:
    .venv/bin/python scripts/check_ollama.py
"""

from __future__ import annotations

import sys
from pathlib import Path

# Make the `app` package importable when this is run as a standalone script.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.llm import llm_complete, model_name  # noqa: E402


def main() -> int:
    print(f"Asking Ollama model '{model_name()}' to say hello...\n")
    try:
        reply = llm_complete("Say hello in one short, friendly sentence.")
    except Exception as exc:
        print(f"LLM call FAILED: {exc}\n")
        print("Checklist:")
        print("  - Is the Ollama server running?   ->  ollama serve")
        print(f"  - Is the model pulled?            ->  ollama pull {model_name()}")
        return 1
    print(f"Reply: {reply}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
