# Radiology AI Scribe

A voice-driven **AI scribe for radiologists**. A doctor dictates findings in plain
English; the system transcribes the audio and uses an LLM to produce a clean,
structured report — slotting findings into a template, auto-filling the *normal*
statement for any organ not mentioned, and generating an Impression.

**Scribe only — it structures the doctor's own words. No image interpretation, no
diagnosis.** See [`CLAUDE.md`](./CLAUDE.md) for the full project rules and
[`PLAN.md`](./PLAN.md) for the build roadmap.

> ⚠️ Healthcare project. Never commit real patient data — use only `sample_data/`.

## Repo structure

```
claro/
  backend/            # FastAPI API (Python)
    app/
      main.py         # FastAPI app + routes (health only for now)
      __init__.py
    requirements.txt
    .venv/            # local virtualenv (gitignored)
  frontend/           # Next.js App Router + TypeScript + Tailwind + shadcn/ui
    app/  components/  lib/
  sample_data/        # synthetic template + dictation (NO real data)
  CLAUDE.md  PLAN.md  README.md
```

## Prerequisites

- **Node.js** 20+ (developed on v24)
- **Python** 3.11+ (developed on 3.13)
- **Ollama** + a local model — only needed from Task 3 onward:
  `ollama pull llama3.1:8b`

## Backend — setup & run

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Confirm it booted:

```bash
curl http://127.0.0.1:8000/health
# -> {"status":"ok"}
```

Interactive API docs: <http://127.0.0.1:8000/docs>

## Frontend — setup & run

```bash
cd frontend
npm install        # the scaffold already installed deps; run only if node_modules/ is missing
npm run dev
```

Open <http://localhost:3000> — you should see the default starter page.

## Editor note (VS Code / Pylance)

If the editor reports `Import "fastapi" could not be resolved`, point it at the
backend virtualenv interpreter `backend/.venv/bin/python`
(Command Palette → **Python: Select Interpreter**). The package is installed; the
warning just means the editor isn't using the venv yet.

## Build order

Follow [`PLAN.md`](./PLAN.md) **one task at a time**. Task 1 (this scaffold) is only
the runnable skeleton — transcription (Stage 1), the swappable LLM interface,
structuring with auto-normal statements (Stage 2), and the recorder UI come next.
