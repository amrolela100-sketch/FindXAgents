/**
 * WorkspacePage — WorkspaceForm Component
 */

import { useState } from "react";
import { Loader2, Check } from "lucide-react";
import type { Workspace } from "@/lib/workspace-context";
import { INDUSTRIES, REGIONS } from "./constants";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5 text-text-muted">
      {children}
    </label>
  );
}

export function WorkspaceForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial?: Partial<Workspace>;
  onSave: (data: Record<string, string>) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    icp: initial?.icp ?? "",
    targetIndustry: initial?.targetIndustry ?? "",
    targetCity: initial?.targetCity ?? "",
  });

  const valid = form.name.trim().length > 0;

  return (
    <div className="space-y-4">
      <div><FieldLabel>Name *</FieldLabel>
        <input className="input text-[13px]" placeholder="e.g. Enterprise NL Q3" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} autoFocus />
      </div>
      <div><FieldLabel>Description</FieldLabel>
        <input className="input text-[13px]" placeholder="Short note (optional)" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
      </div>
      <div><FieldLabel>Ideal Customer Profile (ICP)</FieldLabel>
        <textarea rows={3} className="input text-[13px] resize-none" placeholder="Describe your ideal customer — size, pain points, tech stack…" value={form.icp} onChange={(e) => setForm((f) => ({ ...f, icp: e.target.value }))} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><FieldLabel>Industry</FieldLabel>
          <select className="input text-[13px]" value={form.targetIndustry} onChange={(e) => setForm((f) => ({ ...f, targetIndustry: e.target.value }))}>
            <option value="">All industries</option>
            {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        <div><FieldLabel>Region</FieldLabel>
          <select className="input text-[13px]" value={form.targetCity} onChange={(e) => setForm((f) => ({ ...f, targetCity: e.target.value }))}>
            <option value="">Global / All Regions</option>
            {REGIONS.map((g) => (<optgroup key={g.group} label={g.group}>{g.options.map((c) => <option key={c} value={c}>{c}</option>)}</optgroup>))}
          </select>
        </div>
      </div>
      <div className="flex items-center gap-2 pt-2">
        <button onClick={() => onSave(form)} disabled={saving || !valid} className="btn btn-primary text-[13px] px-4 py-2 gap-2 font-semibold rounded-full">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" strokeWidth={2.5} />} Save workspace
        </button>
        <button onClick={onCancel} className="btn btn-ghost text-[13px] px-4 py-2 rounded-full">Cancel</button>
      </div>
    </div>
  );
}
