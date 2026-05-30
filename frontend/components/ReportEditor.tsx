"use client";

import { useState } from "react";
import { AlertCircle, Check, Copy, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { structureReport } from "@/lib/api";

interface ReportEditorProps {
  /** The (possibly edited) transcript to structure. */
  transcript: string;
  /** The selected template's content, sent to /structure. */
  template: string;
}

/** Generates the structured report from the transcript, then lets the doctor edit it. */
export function ReportEditor({ transcript, template }: ReportEditorProps) {
  const [report, setReport] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setError(null);
    setLoading(true);
    try {
      setReport(await structureReport(transcript, template));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Structuring failed.");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy to clipboard.");
    }
  }

  const hasReport = report.trim().length > 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          size="lg"
          onClick={generate}
          disabled={!transcript.trim() || loading}
          className="w-fit"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" /> Generating…
            </>
          ) : (
            <>
              <Sparkles /> {hasReport ? "Regenerate report" : "Generate report"}
            </>
          )}
        </Button>

        {hasReport && (
          <Button type="button" size="lg" variant="outline" onClick={copy} className="w-fit">
            {copied ? (
              <>
                <Check /> Copied
              </>
            ) : (
              <>
                <Copy /> Copy report
              </>
            )}
          </Button>
        )}
      </div>

      {!transcript.trim() && !hasReport && (
        <p className="text-sm text-muted-foreground">
          Record or type a transcript above, then generate the structured report.
        </p>
      )}

      {error && (
        <p className="flex items-center gap-1.5 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </p>
      )}

      <Textarea
        value={report}
        onChange={(e) => setReport(e.target.value)}
        placeholder="The structured report will appear here — editable before you use it."
        className="min-h-80 font-mono text-sm leading-relaxed"
      />

      {hasReport && (
        <p className="text-xs text-muted-foreground">
          Auto-generated draft — review every line before clinical use.
        </p>
      )}
    </div>
  );
}
