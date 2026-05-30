// Single API client for the scribe backend. The base URL is configurable so a
// hosted deployment can point elsewhere; it defaults to the local FastAPI server.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/** Build a WebSocket URL for a backend path from the configured API base.
 *  http -> ws and https -> wss (replacing the leading scheme only). */
export function wsUrl(path: string): string {
  return `${API_URL.replace(/^http/, "ws")}${path}`;
}

/** Stage 1: upload recorded audio, get the raw transcript back. */
export async function transcribeAudio(audio: Blob): Promise<string> {
  const form = new FormData();
  // The filename extension hints the backend's audio decoder; MediaRecorder
  // produces webm in Chrome/Firefox.
  form.append("file", audio, "recording.webm");

  const res = await fetch(`${API_URL}/transcribe`, { method: "POST", body: form });
  if (!res.ok) {
    throw new Error(`Transcription failed (${res.status}): ${await detail(res)}`);
  }
  const data = (await res.json()) as { transcript: string };
  return data.transcript;
}

/** Stage 2: turn a transcript + template into a structured report. */
export async function structureReport(transcript: string, template: string): Promise<string> {
  const res = await fetch(`${API_URL}/structure`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript, template }),
  });
  if (!res.ok) {
    throw new Error(`Structuring failed (${res.status}): ${await detail(res)}`);
  }
  const data = (await res.json()) as { report: string };
  return data.report;
}

/** Best-effort extraction of FastAPI's {detail: "..."} error body. */
async function detail(res: Response): Promise<string> {
  try {
    const data = await res.json();
    return typeof data?.detail === "string" ? data.detail : res.statusText;
  } catch {
    return res.statusText;
  }
}
