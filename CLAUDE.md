# CLAUDE.md — Project Context

> This file is read automatically by Claude Code at the start of every session.
> It tells you (Claude Code) what this project is, how it's built, and the rules
> to follow. Read it fully before writing any code.

## What we are building

An **AI scribe for radiologists**. A doctor dictates findings out loud in natural,
conversational English (in any order). The system transcribes the speech, then uses
an LLM to turn the messy transcript into a clean, structured radiology report:
slotting findings into a template, fixing grammar, auto-generating an "Impression",
and — crucially — auto-filling the *normal* statements for any organ the doctor did
NOT mention.

This is a **scribe**, not a diagnostic tool. It transcribes and structures the
doctor's own words. It must NEVER interpret medical images or invent clinical
findings on its own. The radiologist is always in control and reviews everything.

## Core product loop (build this first, end to end)

1. Doctor records audio in the browser (press mic → speak → press stop).
2. Audio is sent to the backend.
3. **Stage 1 — Transcribe:** faster-whisper converts audio → raw text.
4. **Stage 2 — Structure:** the LLM takes (raw transcript + chosen template) and
   produces the final structured report, including auto-normal statements and an
   auto-generated impression.
5. The structured report is shown in an editable text area in the browser.

## Tech stack (do not substitute without asking)

- **Frontend:** Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Backend:** Python + FastAPI
- **Speech-to-text:** `faster-whisper` (model: `large-v3`, fall back to `medium`
  if the dev machine is weak), run locally. CPU is fine for the prototype.
- **LLM:** local via **Ollama** for the prototype (model: `llama3.1:8b` or
  `qwen2.5:14b`). Keep the LLM call behind a single function/interface
  (`llm_complete(prompt) -> str`) so we can swap to a hosted API later WITHOUT
  changing the rest of the code.
- **Database:** none for Phase 1. Use local files / in-memory. Add Postgres
  (Supabase) only when Phase 1 works.

## Hard rules

1. **Privacy / compliance:** This is healthcare. NEVER hardcode, log, or commit
   real patient data. Use only the synthetic data in `sample_data/`. Do not add
   analytics, telemetry, or third-party trackers. (India DPDP Act applies.)
2. **No image interpretation.** Do not add any feature that reads or interprets
   medical images. Out of scope and a regulatory risk.
3. **Swappable LLM and STT.** Both must sit behind a clean interface so the model
   can be changed in one place.
4. **One slice at a time.** Do not scaffold features ahead of the current task in
   PLAN.md. Build, run, and verify the current task before moving on.
5. **Always show me how to run and test** what you just built before continuing.
6. If a choice isn't covered here, ASK me rather than guessing on architecture.

## Project structure (target)

```
scribe/
  backend/
    app/
      main.py            # FastAPI app + routes
      transcribe.py      # Stage 1: faster-whisper wrapper
      structure.py       # Stage 2: LLM structuring + auto-normal logic
      llm.py             # llm_complete() — the swappable LLM interface
      prompts.py         # all LLM prompt templates live here
    requirements.txt
  frontend/
    app/                 # Next.js App Router
    components/          # Recorder, ReportEditor, TemplatePicker
    lib/                 # api client
  sample_data/           # synthetic templates + dictations (provided)
  PLAN.md
  CLAUDE.md
```

## The two-stage accuracy strategy (important)

Medical transcription must be accurate. We get there with two passes:

- **Pass 1 (transcribe.py):** Give faster-whisper an `initial_prompt` loaded with
  common radiology vocabulary so it spells medical terms correctly. Enable VAD
  filtering.
- **Pass 2 (structure.py):** The LLM prompt explicitly instructs the model to
  correct any misheard medical terms, THEN structure the report. So the LLM both
  cleans and structures in one call.

## The auto-normal-statement behaviour (the killer feature)

When structuring, the LLM must:
- Place each spoken (positive) finding into the correct template section.
- For every organ/section in the template that the doctor did NOT mention, insert
  the standard NORMAL statement for that organ (these live in the template file).
- Generate a concise "Impression" summarising only the positive findings.
- Never invent positive findings. Silence about an organ = normal, never abnormal.

## Coding conventions

- TypeScript strict mode on. Python type hints everywhere.
- Small, readable functions. Comments explain *why*, not *what*.
- No secrets in code. Use a `.env` file (and add it to `.gitignore`).
