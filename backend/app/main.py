"""FastAPI entry point for the radiology AI scribe backend.

Phase 1 skeleton: only health-check routes live here. Feature routes
(`/transcribe`, `/structure`) are added in later PLAN.md tasks — do not
add them ahead of time.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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
