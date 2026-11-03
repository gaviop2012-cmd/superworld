import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Lock, ExternalLink, Lightbulb, Loader2, Hand, MessageSquare } from "lucide-react";

const ext = { target: "_blank", rel: "noopener noreferrer" };

export default function ClueCard({ index, clue, solved, locked, onGrade, team, meId }) {
  const [answer, setAnswer] = useState("");
  const [src, setSrc] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [hints, setHints] = useState(0);
  const [comment, setComment] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setResult(await onGrade(answer, src));
    setBusy(false);
  };

  if (locked) {
    return (
      <Card className="p-5 flex items-center gap-3 text-muted-foreground opacity-70">
        <Lock className="w-4 h-4" /> Clue {index}: solve clue {index - 1} to unlock
      </Card>
    );
  }

  return (
    <Card className={`p-5 ${solved ? "border-primary/60 bg-primary/10" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary">Clue {index}</p>
          <h3 className="font-display text-xl">{clue.title || `Clue ${index}`}</h3>
        </div>
        {solved ? <Badge className="bg-primary gap-1"><CheckCircle2 className="w-3.5 h-3.5" />Solved</Badge> : null}
      </div>
      <p className="mt-3 text-sm leading-relaxed whitespace-pre-line">{clue.instruction}</p>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {clue.start_url && <a href={clue.start_url} {...ext} className="text-primary hover:underline inline-flex items-center gap-1"><ExternalLink className="w-3.5 h-3.5" />Start here</a>}
        {(clue.sources || []).map((s) => (
          <a key={s} href={s} {...ext} className="text-muted-foreground hover:underline truncate max-w-[260px]">{s.replace(/^https?:\/\//, "")}</a>
        ))}
      </div>
      {clue.submission_format && <p className="text-xs text-muted-foreground mt-3">Submit: {clue.submission_format}</p>}
      <p className="text-xs text-muted-foreground mt-1">External sites open in a new tab. Never share personal data.</p>

      {team && (
        <div className="mt-3 flex items-center gap-2 text-sm">
          {team.claim ? (
            <>
              <Badge variant="outline" className="gap-1"><Hand className="w-3 h-3" />{team.claim.username} is on it</Badge>
              {(team.claim.user_id === meId || team.isOwner) && <Button size="sm" variant="ghost" onClick={() => team.onClaim(true)}>Release</Button>}
            </>
          ) : <Button size="sm" variant="outline" onClick={() => team.onClaim(false)}><Hand className="w-3.5 h-3.5 mr-1" />Claim this clue</Button>}
        </div>
      )}

      {solved ? (
        <div className="mt-4 text-sm bg-card border p-3">
          <p className="font-medium">Accepted evidence by {solved.username}</p>
          <p className="text-muted-foreground mt-1 whitespace-pre-line">{solved.text}</p>
          {result?.finding && <p className="mt-2 text-foreground"><b>Finding:</b> {result.finding}</p>}
          {result?.contribution && <p className="mt-1 text-muted-foreground"><b>Why it matters:</b> {result.contribution}</p>}
        </div>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-2">
          <Textarea required minLength={2} maxLength={2000} rows={2} placeholder="Your discovery, in a full sentence" value={answer} onChange={(e) => setAnswer(e.target.value)} />
          <Input type="url" placeholder="Supporting source URL (optional)" value={src} onChange={(e) => setSrc(e.target.value)} />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" disabled={busy} className="bg-primary hover:bg-primary/90">{busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Submit evidence</Button>
            {[clue.hint1, clue.hint2].map((h, i) => h && hints === i && (
              <Button key={i} type="button" variant="outline" size="sm" onClick={() => setHints(i + 1)}><Lightbulb className="w-3.5 h-3.5 mr-1" />Hint {i + 1}</Button>
            ))}
          </div>
          {result && !result.correct && <p className="text-sm text-destructive">{result.message}</p>}
        </form>
      )}
      {hints > 0 && !solved && <div className="mt-3 text-sm bg-primary/10 border border-primary/40 rounded-md p-3 space-y-1">
        {hints >= 1 && <p><b>Hint 1:</b> {clue.hint1}</p>}{hints >= 2 && <p><b>Hint 2:</b> {clue.hint2}</p>}
      </div>}

      {team && (
        <div className="mt-4 border-t pt-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1 mb-2"><MessageSquare className="w-3.5 h-3.5" />Team notes</p>
          {team.comments.map((c) => <p key={c.id} className="text-sm"><b>{c.username}:</b> {c.text}</p>)}
          <form className="flex gap-2 mt-2" onSubmit={(e) => { e.preventDefault(); if (comment.trim()) { team.onComment(comment); setComment(""); } }}>
            <Input maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Share a lead with your team" />
            <Button type="submit" variant="outline">Post</Button>
          </form>
        </div>
      )}
    </Card>
  );
}