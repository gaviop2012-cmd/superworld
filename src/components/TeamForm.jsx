import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { TEAM_VIS, EVIDENCE_VIS } from "@/lib/constants";

function Opts({ value, onChange, options }) {
  return (
    <RadioGroup value={value} onValueChange={onChange} className="grid gap-2">
      {options.map(([v, l, d]) => (
        <label key={v} className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/10">
          <RadioGroupItem value={v} className="mt-1" /><span><b className="text-sm">{l}</b><br /><span className="text-xs text-muted-foreground">{d}</span></span>
        </label>
      ))}
    </RadioGroup>
  );
}

export default function TeamForm({ initial, submitLabel, onSubmit }) {
  const [v, setV] = useState({ name: "", description: "", visibility: "public", evidence_visibility: "team", ...initial });
  const [busy, setBusy] = useState(false);
  return (
    <form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); setBusy(true); await onSubmit(v); setBusy(false); }}>
      <div className="space-y-1"><Label>Team name</Label><Input required minLength={3} maxLength={40} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></div>
      <div className="space-y-1"><Label>Description</Label><Textarea maxLength={300} rows={2} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} /></div>
      <div className="space-y-1"><Label>Team visibility</Label><Opts value={v.visibility} onChange={(x) => setV({ ...v, visibility: x })} options={TEAM_VIS} /></div>
      <div className="space-y-1"><Label>Evidence board visibility</Label><Opts value={v.evidence_visibility} onChange={(x) => setV({ ...v, evidence_visibility: x })} options={EVIDENCE_VIS} /></div>
      <Button disabled={busy} className="w-full bg-primary hover:bg-primary/90">{submitLabel}</Button>
    </form>
  );
}