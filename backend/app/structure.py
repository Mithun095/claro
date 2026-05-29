"""Stage 2 — structure a raw transcript into a clean radiology report.

Takes the messy speech transcript plus the chosen template and returns the final
report: positive findings slotted into their sections, NORMAL statements
auto-filled for every unmentioned organ, misheard terms corrected, and an
Impression of only the positive findings. All the behaviour lives in the prompt
(see app/prompts.py); this module just wires it to the swappable LLM.
"""

from __future__ import annotations

from .llm import llm_complete
from .prompts import build_structure_prompt


def structure_report(transcript: str, template: str) -> str:
    """Return the structured report for a transcript + template (one LLM call)."""
    prompt = build_structure_prompt(transcript=transcript, template=template)
    return llm_complete(prompt).strip()
