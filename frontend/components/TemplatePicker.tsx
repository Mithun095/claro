"use client";

import type { Template } from "@/lib/templates";

interface TemplatePickerProps {
  templates: Template[];
  value: string;
  onChange: (id: string) => void;
}

/** Pick the report template. Phase 1 has one; this is ready for a list later. */
export function TemplatePicker({ templates, value, onChange }: TemplatePickerProps) {
  return (
    <select
      aria-label="Report template"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {templates.map((t) => (
        <option key={t.id} value={t.id}>
          {t.name}
        </option>
      ))}
    </select>
  );
}
