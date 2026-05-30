"use client";

import { useRef, useState } from "react";
import { Loader2, Mic, Square } from "lucide-react";

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

/** Mic button: streams audio to /ws/transcribe and shows the transcript live. */
export function Recorder({ onTranscript, onPartial, disabled }: RecorderProps) {
  const [recording, setRecording] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessionRef = useRef<LiveSession | null>(null);

  async function start() {
    setError(null);
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
    <div className="flex flex-col gap-2">
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
        <p className="text-sm text-muted-foreground">
          Listening… your words appear below as you speak, then press Stop.
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
