"use client";

import { ChevronDown } from "lucide-react";

import type { Template } from "@/lib/templates";

interface TemplatePickerProps {
  templates: Template[];
  value: string;
  onChange: (id: string) => void;
}

/** Pick the report template. Phase 1 has one; this is ready for a list later. */
export function TemplatePicker({ templates, value, onChange }: TemplatePickerProps) {
  return (
    <div className="relative">
      <select
        aria-label="Report template"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full appearance-none rounded-lg border border-input bg-background px-3 pr-9 text-sm transition-colors outline-none hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {templates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}
