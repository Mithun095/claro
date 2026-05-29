"""Stage 1 — speech-to-text via faster-whisper.

This module is the single, swappable STT interface: the rest of the app only
calls `transcribe_audio(path) -> str`. The engine can be replaced here without
touching any caller (hard rule #3 in CLAUDE.md).
"""

from __future__ import annotations

import os
from functools import lru_cache

from faster_whisper import WhisperModel

# Radiology vocabulary fed to Whisper as `initial_prompt` so it spells medical
# terms correctly (Pass 1 of the two-stage accuracy strategy). Stage 2 (the LLM)
# still corrects anything that slips through, but a good prompt reduces the work.
RADIOLOGY_INITIAL_PROMPT = (
    "Radiology dictation, contrast and non-contrast CT of the abdomen and pelvis. "
    "Terms include: liver, hepatomegaly, hepatic, attenuation, focal lesion, "
    "intrahepatic biliary dilatation, gallbladder, cholelithiasis, calculus, "
    "cholecystitis, wall thickening, pancreas, pancreatitis, peripancreatic fat "
    "stranding, spleen, splenomegaly, kidneys, renal, hydronephrosis, calculi, "
    "adrenal glands, urinary bladder, bowel loops, peritoneum, peritoneal cavity, "
    "ascites, free fluid, lymphadenopathy, right upper quadrant, centimetres, "
    "millimetres, unremarkable, no significant abnormality detected."
)


@lru_cache(maxsize=1)
def _get_model() -> WhisperModel:
    """Load the Whisper model once (lazily) and cache it for the process.

    Loading is expensive and downloads the weights on first use, so we keep a
    single process-wide instance. Configuration comes from env vars so the model
    can be swapped in one place (CLAUDE.md):

      WHISPER_MODEL           default "medium" (large-v3 = best but ~3GB/slow on CPU)
      WHISPER_FALLBACK_MODEL  used if WHISPER_MODEL fails to load (default "medium")
      WHISPER_DEVICE          "cpu" (default) or "cuda"
      WHISPER_COMPUTE_TYPE    "int8" (default) keeps CPU memory/latency reasonable

    If the configured model can't load (e.g. too large for this machine), we fall
    back to the smaller model, as CLAUDE.md permits.
    """
    model_name = os.getenv("WHISPER_MODEL", "medium")
    fallback_model = os.getenv("WHISPER_FALLBACK_MODEL", "medium")
    device = os.getenv("WHISPER_DEVICE", "cpu")
    compute_type = os.getenv("WHISPER_COMPUTE_TYPE", "int8")

    try:
        return WhisperModel(model_name, device=device, compute_type=compute_type)
    except Exception:
        if model_name != fallback_model:
            return WhisperModel(fallback_model, device=device, compute_type=compute_type)
        raise


def transcribe_audio(audio_path: str) -> str:
    """Transcribe an audio file to raw text (Stage 1).

    VAD filtering drops non-speech so silence/background noise doesn't produce
    hallucinated text. Returns the concatenated transcript, stripped.
    """
    model = _get_model()
    segments, _info = model.transcribe(
        audio_path,
        language="en",  # Phase 1 is English-only (CLAUDE.md)
        vad_filter=True,
        initial_prompt=RADIOLOGY_INITIAL_PROMPT,
    )
    # `segments` is a generator; iterating it is what actually runs inference.
    return " ".join(segment.text.strip() for segment in segments).strip()
