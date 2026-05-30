"use client";

import { useMemo, useState } from "react";
import { FileText, LayoutTemplate, Mic, Sparkles } from "lucide-react";

import { Recorder } from "@/components/Recorder";
import { ReportEditor } from "@/components/ReportEditor";
import { TemplatePicker } from "@/components/TemplatePicker";
import { Badge } from "@/components/ui/badge";
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

/** Numbered step marker for the workflow cards. */
function StepBadge({ n, icon }: { n: number; icon: React.ReactNode }) {
  return (
    <span className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20">
      {icon}
      <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
        {n}
      </span>
    </span>
  );
}

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
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-8 sm:py-10">
      <section className="flex flex-col items-start gap-3">
        <Badge variant="default" className="gap-1.5">
          <Sparkles />
          Two-stage accuracy · runs locally
        </Badge>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Dictate naturally. Get a structured report.
        </h1>
        <p className="max-w-2xl text-pretty text-muted-foreground">
          Speak your findings in any order — the scribe transcribes as you talk, then fills in
          the standard normal statement for every organ you didn&apos;t mention and drafts an
          impression. You review and edit everything before it&apos;s used.
        </p>
      </section>

      <Card className="shadow-sm transition-shadow hover:shadow-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <StepBadge n={1} icon={<LayoutTemplate className="size-4" />} />
            <div className="grid gap-0.5">
              <CardTitle>Choose a template</CardTitle>
              <CardDescription>Phase 1 ships a single CT abdomen template.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <TemplatePicker templates={TEMPLATES} value={templateId} onChange={setTemplateId} />
        </CardContent>
      </Card>

      <Card className="shadow-sm transition-shadow hover:shadow-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <StepBadge n={2} icon={<Mic className="size-4" />} />
            <div className="grid gap-0.5">
              <CardTitle>Dictate your findings</CardTitle>
              <CardDescription>Press record and speak — the transcript appears live.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Recorder onTranscript={setTranscript} onPartial={setPartial} />
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="transcript">Transcript</Label>
              <span className="text-xs text-muted-foreground">Editable — fix any mishearings</span>
            </div>
            <Textarea
              id="transcript"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Your transcribed dictation will appear here as you speak."
              className="min-h-28 leading-relaxed"
            />
            {partial && (
              <div
                className="flex items-start gap-2 rounded-lg bg-primary/5 px-3 py-2 text-sm text-muted-foreground"
                aria-live="polite"
              >
                <span className="mt-1.5 inline-block size-2 shrink-0 animate-pulse rounded-full bg-primary" />
                <span className="italic">{partial}…</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm transition-shadow hover:shadow-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <StepBadge n={3} icon={<FileText className="size-4" />} />
            <div className="grid gap-0.5">
              <CardTitle>Structured report</CardTitle>
              <CardDescription>Generate from the transcript, then edit as needed.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ReportEditor transcript={transcript} template={template.content} />
        </CardContent>
      </Card>
    </div>
  );
}
