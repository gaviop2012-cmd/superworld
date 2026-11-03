import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES, LEVELS, QUEST_VIS, REVEAL } from "@/lib/constants";

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

export default function QuestFields({ f, setQuest, setKey }) {
  const q = f.quest, k = f.key;
  const sq = (key) => (e) => setQuest({ [key]: e.target.value });
  return (
    <div className="grid gap-5">
      <div className="space-y-1"><Label>Title</Label><Input value={q.title} onChange={sq("title")} /></div>
      <div className="space-y-1"><Label>One-line teaser</Label><Input value={q.tagline} onChange={sq("tagline")} /></div>
      <div className="space-y-1"><Label>Briefing</Label><Textarea rows={4} value={q.briefing} onChange={sq("briefing")} /></div>
      <div className="space-y-1"><Label>Head question (one only)</Label><Input value={q.head_question} onChange={sq("head_question")} /></div>
      <div className="grid sm:grid-cols-4 gap-4">
        <div className="space-y-1"><Label>Category</Label>
          <Select value={q.category} onValueChange={(v) => setQuest({ category: v })}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CATEGORIES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1"><Label>Difficulty</Label>
          <Select value={String(q.difficulty)} onValueChange={(v) => setQuest({ difficulty: Number(v) })}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(LEVELS).map(([v, l]) => <SelectItem key={v} value={v}>{v} · {l}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1"><Label>Minutes</Label><Input type="number" min={5} value={q.est_minutes} onChange={(e) => setQuest({ est_minutes: Number(e.target.value) })} /></div>
        <div className="space-y-1"><Label>Language</Label><Input value={q.language} onChange={sq("language")} /></div>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2"><Label>Quest visibility</Label><Opts value={q.visibility} onChange={(v) => setQuest({ visibility: v })} options={QUEST_VIS} /></div>
        <div className="space-y-2"><Label>Clue visibility</Label><Opts value={q.clue_reveal} onChange={(v) => setQuest({ clue_reveal: v })} options={REVEAL} /></div>
      </div>
      <div className="space-y-1"><Label>Source note for players (optional)</Label><Input value={q.source_note} onChange={sq("source_note")} /></div>
      <div className="rounded-lg border border-dashed p-4 grid gap-4 bg-muted/40">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Final answer key (private)</p>
        <div className="space-y-1"><Label>Final answer</Label><Input value={k.final_answer} onChange={(e) => setKey({ final_answer: e.target.value })} /></div>
        <div className="space-y-1"><Label>Accepted variants (comma-separated)</Label><Input value={k.aliases} onChange={(e) => setKey({ aliases: e.target.value })} placeholder="short name, alias, alternate spelling" /></div>
        <div className="space-y-1"><Label>Final reasoning using all five clues</Label><Textarea rows={4} value={k.explanation} onChange={(e) => setKey({ explanation: e.target.value })} /></div>
        <label className="flex items-start gap-2 text-sm"><Checkbox checked={k.rights_ack} onCheckedChange={(v) => setKey({ rights_ack: !!v })} className="mt-0.5" />
          I confirm this quest is accurate, uses permitted public sources, and asks players to do nothing unsafe or invasive.</label>
      </div>
    </div>
  );
}