"use client";

import { useState } from "react";
import { FileText, Loader2 } from "lucide-react";

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

  return (
    <div className="flex flex-col gap-3">
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
            <FileText /> Generate structured report
          </>
        )}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Textarea
        value={report}
        onChange={(e) => setReport(e.target.value)}
        placeholder="The structured report will appear here — editable before you use it."
        className="min-h-80 font-mono text-sm"
      />
    </div>
  );
}
