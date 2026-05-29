"""FastAPI entry point for the radiology AI scribe backend.

Phase 1 routes: Stage 1 transcription (`POST /transcribe`) and Stage 2
structuring with auto-normal statements (`POST /structure`).
"""

import os
import tempfile
from pathlib import Path

from dotenv import load_dotenv

# Load backend/.env before importing modules that read configuration, so env
# vars (e.g. WHISPER_MODEL) are available. No secrets are committed (CLAUDE.md).
BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BACKEND_DIR / ".env")

from fastapi import FastAPI, File, HTTPException, UploadFile  # noqa: E402
from fastapi.concurrency import run_in_threadpool  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from pydantic import BaseModel  # noqa: E402

from .structure import structure_report  # noqa: E402
from .transcribe import transcribe_audio  # noqa: E402

app = FastAPI(title="Radiology AI Scribe API", version="0.1.0")

# The Next.js dev server runs on a different origin (localhost:3000), so the
# browser needs explicit CORS permission to call this API during development.
# This is plumbing for the core loop, not a product feature.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root() -> dict[str, str]:
    return {"service": "radiology-ai-scribe", "status": "ok"}


@app.get("/health")
def health() -> dict[str, str]:
    """Liveness probe — used to confirm the server is up."""
    return {"status": "ok"}


@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)) -> dict[str, str]:
    """Stage 1: accept an uploaded audio file and return its raw transcript.

    The browser records audio (any common format — webm/ogg/wav/mp3) and uploads
    it here; faster-whisper decodes and transcribes it.
    """
    # Preserve the original extension so the decoder picks the right format.
    suffix = Path(file.filename or "").suffix
    tmp_path: str | None = None
    try:
        contents = await file.read()
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp_path = tmp.name
            tmp.write(contents)
        # Transcription is blocking and CPU-bound; run it off the event loop so
        # the server stays responsive to other requests during a long clip.
        transcript = await run_in_threadpool(transcribe_audio, tmp_path)
    except Exception as exc:  # decode failure, model load failure, etc.
        raise HTTPException(status_code=500, detail=f"Transcription failed: {exc}") from exc
    finally:
        await file.close()
        # Always remove the temp file, even if transcription failed.
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)

    return {"transcript": transcript}


class StructureRequest(BaseModel):
    transcript: str
    template: str


@app.post("/structure")
async def structure(req: StructureRequest) -> dict[str, str]:
    """Stage 2: turn a raw transcript + template into a structured report.

    Slots spoken findings into their sections, auto-fills the NORMAL statement for
    every unmentioned organ, corrects misheard terms, and writes an Impression of
    only the positive findings (the rules live in app/prompts.py).
    """
    if not req.transcript.strip():
        raise HTTPException(status_code=400, detail="transcript is empty")
    if not req.template.strip():
        raise HTTPException(status_code=400, detail="template is empty")

    try:
        # Structuring is a blocking LLM call; keep it off the event loop.
        report = await run_in_threadpool(structure_report, req.transcript, req.template)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Structuring failed: {exc}") from exc

    return {"report": report}
