import { AudioLines, ShieldCheck } from "lucide-react";

/** Sticky top bar: product identity + a standing reminder that this is a scribe,
 *  not a diagnostic tool (CLAUDE.md). Server component — no interactivity. */
export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-6 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <AudioLines className="size-5" />
          </span>
          <div className="leading-tight">
            <p className="font-heading text-sm font-semibold tracking-tight">Radiology AI Scribe</p>
            <p className="text-xs text-muted-foreground">Dictate · Structure · Review</p>
          </div>
        </div>
        <span className="hidden items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground sm:inline-flex">
          <ShieldCheck className="size-3.5 text-primary" />
          Scribe only
        </span>
      </div>
    </header>
  );
}
