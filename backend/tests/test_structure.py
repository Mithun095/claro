"""Tests for Stage 2 structuring (Task 4).

The route/logic tests mock the LLM so they run fast and deterministically.
"""

from fastapi.testclient import TestClient

from app import main, prompts, structure
from app.main import app

client = TestClient(app)


def test_build_structure_prompt_includes_inputs_and_rules():
    p = prompts.build_structure_prompt(transcript="liver is enlarged", template="LIVER:\n  normal: x")
    assert "liver is enlarged" in p
    assert "LIVER:" in p
    # Core safety rules must be present in the prompt.
    assert "NORMAL statement" in p
    assert "invent" in p.lower()


def test_structure_report_calls_llm_and_strips(monkeypatch):
    captured = {}

    def fake_llm(prompt):
        captured["prompt"] = prompt
        return "  FINAL REPORT  "

    monkeypatch.setattr(structure, "llm_complete", fake_llm)
    out = structure.structure_report("liver enlarged", "LIVER:")
    assert out == "FINAL REPORT"
    assert "liver enlarged" in captured["prompt"]
    assert "LIVER:" in captured["prompt"]


def test_structure_route_returns_report(monkeypatch):
    monkeypatch.setattr(main, "structure_report", lambda transcript, template: "FINAL REPORT")
    r = client.post("/structure", json={"transcript": "liver enlarged", "template": "LIVER:"})
    assert r.status_code == 200
    assert r.json() == {"report": "FINAL REPORT"}


def test_structure_route_requires_both_fields():
    # Missing 'template' -> validation error.
    assert client.post("/structure", json={"transcript": "x"}).status_code == 422


def test_structure_route_rejects_empty_transcript():
    r = client.post("/structure", json={"transcript": "   ", "template": "LIVER:"})
    assert r.status_code == 400
