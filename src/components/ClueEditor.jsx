import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

function Field({ label, hint, children }) {
  return <div className="space-y-1"><Label>{label}</Label>{children}{hint && <p className="text-xs text-muted-foreground">{hint}</p>}</div>;
}

export default function ClueEditor({ clue, onChange }) {
  const set = (k) => (e) => onChange({ ...clue, [k]: e.target.value });
  return (
    <div className="grid gap-4 pt-2">
      <Field label="Clue title"><Input value={clue.title} onChange={set("title")} placeholder="The archived announcement" /></Field>
      <Field label="Player-facing instruction" hint="Say where to start, what to do, and what to submit. Do not include the answer.">
        <Textarea rows={3} value={clue.instruction} onChange={set("instruction")} /></Field>
      <Field label="Starting URL"><Input type="url" value={clue.start_url} onChange={set("start_url")} placeholder="https://" /></Field>
      <Field label="Evidence source URLs (one per line)" hint="Shown to players as research starting points."><Textarea rows={2} value={clue.sources} onChange={set("sources")} /></Field>
      <Field label="Submission format"><Input value={clue.submission_format} onChange={set("submission_format")} placeholder="A date and the person's name" /></Field>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Hint 1 (gentle)"><Input value={clue.hint1} onChange={set("hint1")} /></Field>
        <Field label="Hint 2 (more direct)"><Input value={clue.hint2} onChange={set("hint2")} /></Field>
      </div>
      <div className="rounded-lg border border-dashed p-4 grid gap-4 bg-muted/40">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Answer key (private, never sent to players)</p>
        <Field label="Expected discovery"><Textarea rows={2} value={clue.finding} onChange={set("finding")} /></Field>
        <Field label="Accepted keywords (comma-separated)" hint="An answer is accepted when it contains at least 60% of these words or phrases. Add every spelling variant you want to allow as separate entries.">
          <Input value={clue.keywords} onChange={set("keywords")} placeholder="Rashid, Rosetta, 1799" /></Field>
        <Field label="How this clue contributes to the head question"><Textarea rows={2} value={clue.contribution} onChange={set("contribution")} /></Field>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2"><Field label="Evidence excerpt or locator"><Input value={clue.evidence_excerpt} onChange={set("evidence_excerpt")} /></Field></div>
          <Field label="Date checked"><Input type="date" value={clue.checked_on} onChange={set("checked_on")} /></Field>
        </div>
      </div>
    </div>
  );
}