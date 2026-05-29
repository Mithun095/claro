"use client";

import { useRef, useState } from "react";
import { Loader2, Mic, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { transcribeAudio } from "@/lib/api";

interface RecorderProps {
  /** Called with the transcript once recording is stopped and transcribed. */
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

/** Mic button: record from the browser, upload to /transcribe on stop. */
export function Recorder({ onTranscript, disabled }: RecorderProps) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function start() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        // Release the mic so the browser stops showing the recording indicator.
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
        setProcessing(true);
        try {
          onTranscript(await transcribeAudio(blob));
        } catch (err) {
          setError(err instanceof Error ? err.message : "Transcription failed.");
        } finally {
          setProcessing(false);
        }
      };

      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch {
      setError("Microphone access was denied or is unavailable.");
    }
  }

  function stop() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        size="lg"
        variant={recording ? "destructive" : "default"}
        onClick={recording ? stop : start}
        disabled={disabled || processing}
        className="w-fit"
      >
        {processing ? (
          <>
            <Loader2 className="animate-spin" /> Transcribing…
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
          Recording… speak your findings, then press Stop.
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
