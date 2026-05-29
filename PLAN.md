# PLAN.md — Build Roadmap

Build top to bottom. Finish, run, and verify each task before starting the next.
Each task has a **paste-ready prompt** you can give Claude Code verbatim.

---

## PHASE 1 — The core loop (free, local, the whole point)

Goal: dictate → transcribe → structured report, on your own machine, in English,
with one template. When this works end to end, you have a real product.

### Task 1 — Project scaffolding
> Read CLAUDE.md. Set up the repo structure exactly as described there: a `backend/`
> FastAPI project and a `frontend/` Next.js (App Router, TypeScript, Tailwind,
> shadcn/ui) project. Create a `.gitignore` that excludes `.env`, `node_modules`,
> `__pycache__`, and model caches. Add a root `README.md` with setup steps. Do NOT
> build any features yet — just the skeleton that runs. Then show me the commands to
> start both servers and confirm they boot.

### Task 2 — Transcription endpoint (Stage 1)
> Implement `backend/app/transcribe.py` using `faster-whisper` (`large-v3`, fall
> back to `medium`). Load the radiology `initial_prompt` vocabulary and enable VAD
> filtering as described in CLAUDE.md. Add a FastAPI `POST /transcribe` route in
> `main.py` that accepts an uploaded audio file and returns `{ "transcript": "..." }`.
> Test it by transcribing `sample_data/synthetic_dictation_audio` if present, or tell
> me how to record a test clip. Show me the curl command to test it.

### Task 3 — The swappable LLM interface
> Create `backend/app/llm.py` exposing a single `llm_complete(prompt: str) -> str`
> function that calls a local Ollama model (`llama3.1:8b`). Keep the model name in a
> config/env var. This is the ONLY place the LLM is called. Add a quick test script
> that sends "Say hello" and prints the reply, so I can confirm Ollama works.

### Task 4 — Structuring with auto-normal statements (Stage 2 — the killer feature)
> Implement `backend/app/structure.py` and `backend/app/prompts.py`. Add a
> `POST /structure` route that takes `{ transcript, template }` and returns
> `{ report }`. Follow the auto-normal-statement behaviour in CLAUDE.md exactly: slot
> positive findings into template sections, insert the normal statement (from the
> template) for every unmentioned organ, correct misheard medical terms, and
> generate an Impression of only the positive findings. NEVER invent positive
> findings. Use `sample_data/template_ct_abdomen.md` and
> `sample_data/synthetic_dictation.txt` to test, and show me the output.

### Task 5 — Frontend: recorder + report view
> Build the frontend core loop. A `Recorder` component (mic button → records audio →
> stop) that uploads to `/transcribe`, a `TemplatePicker` (just the one CT abdomen
> template for now), and a `ReportEditor` (editable text area) that calls `/structure`
> and shows the result. Wire it together on the main page. Keep styling clean and
> minimal with Tailwind/shadcn. Show me how to run it and test the full loop.

### Task 6 — Polish the loop
> Add loading states, error handling (mic permission denied, server errors), and a
> "copy report" button. Make sure the whole flow feels smooth. No new features.

**✅ Milestone: Phase 1 done = working product prototype.**

---

## PHASE 2 — Make it real (add only after Phase 1 works)

- Template library: upload/save multiple templates (add Supabase + Postgres here).
- Template-free mode: AI builds a report from its own internal templates when none
  is selected.
- Auth (Supabase Auth) + per-user templates.
- Voice editing: "make the liver 20cm", "remove the calculus" → re-run structure on
  the existing report with an edit instruction.

## PHASE 3 — Differentiators (your edge over Quillr)

- Smart macros / contextual expansion ("bilateral" → side-aware).
- Prior-study comparison.
- Structured scoring (BI-RADS / Lung-RADS) with auto-calculation.
- Indian-language dictation via AI4Bharat IndicConformer.
- (Only after regulatory advice) any image-related features.

## PHASE 4 — Production / compliance (before any real patient touches it)

- Move to hosting with data-processing agreements (BAA), encryption at rest/transit.
- Audit logs, access controls, DPDP/HIPAA review.
- Decide hosted vs self-hosted LLM/STT for scale.
