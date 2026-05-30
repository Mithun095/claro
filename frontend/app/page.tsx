"use client";

import { useMemo, useState } from "react";

import { Recorder } from "@/components/Recorder";
import { ReportEditor } from "@/components/ReportEditor";
import { TemplatePicker } from "@/components/TemplatePicker";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TEMPLATES } from "@/lib/templates";

export default function Home() {
  const [templateId, setTemplateId] = useState(TEMPLATES[0].id);
  const [transcript, setTranscript] = useState("");
  // In-progress words from the live stream, not yet committed to the transcript.
  const [partial, setPartial] = useState("");

  const template = useMemo(
    () => TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[0],
    [templateId],
  );

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Radiology AI Scribe</h1>
        <p className="text-sm text-muted-foreground">
          Dictate your findings in any order; get a structured report with auto-filled
          normal statements. Scribe only — you review and edit everything.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Template</CardTitle>
          <CardDescription>Phase 1 ships a single CT abdomen template.</CardDescription>
        </CardHeader>
        <CardContent>
          <TemplatePicker templates={TEMPLATES} value={templateId} onChange={setTemplateId} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>1 · Dictate</CardTitle>
          <CardDescription>Record, speak your findings, then stop to transcribe.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Recorder onTranscript={setTranscript} onPartial={setPartial} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="transcript">Transcript (editable)</Label>
            <Textarea
              id="transcript"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Your transcribed dictation will appear here — fix any mishearings before generating."
              className="min-h-28"
            />
            {partial && (
              <p className="text-sm italic text-muted-foreground" aria-live="polite">
                {partial}…
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2 · Structured report</CardTitle>
          <CardDescription>Generate from the transcript, then edit as needed.</CardDescription>
        </CardHeader>
        <CardContent>
          <ReportEditor transcript={transcript} template={template.content} />
        </CardContent>
      </Card>
    </main>
  );
}
