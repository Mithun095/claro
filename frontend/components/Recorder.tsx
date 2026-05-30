"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2, Mic, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { startLiveTranscription, type LiveSession } from "@/lib/liveTranscribe";

interface RecorderProps {
  /** Receives committed transcript text live while recording, then the final
   *  transcript when recording stops. */
  onTranscript: (text: string) => void;
  /** Receives the in-progress (not-yet-committed) words while recording. */
  onPartial?: (partial: string) => void;
  disabled?: boolean;
}

/** mm:ss for the recording timer. */
function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Mic button: streams audio to /ws/transcribe and shows the transcript live. */
export function Recorder({ onTranscript, onPartial, disabled }: RecorderProps) {
  const [recording, setRecording] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const sessionRef = useRef<LiveSession | null>(null);

  // Tick the on-screen timer once per second while recording.
  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [recording]);

  async function start() {
    setError(null);
    setElapsed(0);
    onPartial?.("");
    // A fresh dictation replaces any previous transcript.
    onTranscript("");
    try {
      sessionRef.current = await startLiveTranscription({
        onUpdate: ({ committed, partial }) => {
          onTranscript(committed);
          onPartial?.(partial);
        },
        onError: (err) => {
          // Mid-stream connection loss: surface it and drop out of recording.
          setError(err.message);
          setRecording(false);
          onPartial?.("");
          sessionRef.current = null;
        },
      });
      setRecording(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start recording.");
    }
  }

  async function stop() {
    const session = sessionRef.current;
    sessionRef.current = null;
    setRecording(false);
    onPartial?.("");
    if (!session) return;
    setFinalizing(true);
    try {
      onTranscript(await session.stop());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not finalize the transcript.");
    } finally {
      setFinalizing(false);
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          size="lg"
          variant={recording ? "destructive" : "default"}
          onClick={recording ? stop : start}
          disabled={disabled || finalizing}
          className="w-fit"
        >
          {finalizing ? (
            <>
              <Loader2 className="animate-spin" /> Finishing…
            </>
          ) : recording ? (
            <>
              <Square /> Stop
            </>
          ) : (
            <>
              <Mic /> Record
            </>
          )}
        </Button>

        {recording && (
          <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive/60" />
              <span className="relative inline-flex size-2.5 rounded-full bg-destructive" />
            </span>
            Recording
            <span className="font-mono tabular-nums text-foreground">{formatElapsed(elapsed)}</span>
          </span>
        )}
      </div>

      {recording && (
        <p className="text-sm text-muted-foreground">
          Speak your findings in any order — your words appear below as you talk.
        </p>
      )}

      {error && (
        <p className="flex items-center gap-1.5 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
