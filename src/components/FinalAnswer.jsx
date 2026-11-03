import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Trophy, Loader2 } from "lucide-react";

export default function FinalAnswer({ ready, finalSub, onGrade }) {
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  if (finalSub) {
    return (
      <Card className="p-6 border-primary bg-primary/10">
        <div className="flex items-center gap-2 text-foreground font-display text-2xl"><Trophy className="w-6 h-6" />Case solved</div>
        <p className="mt-2 text-sm">Final answer by {finalSub.username}: <b>{finalSub.text}</b></p>
        {result?.explanation && <p className="mt-3 text-sm text-muted-foreground whitespace-pre-line">{result.explanation}</p>}
      </Card>
    );
  }
  return (
    <Card className={`p-6 ${ready ? "" : "opacity-60"}`}>
      <h3 className="font-display text-2xl">Final answer</h3>
      <p className="text-sm text-muted-foreground mt-1">{ready ? "Combine your five discoveries into one conclusion." : "Unlocks once all five clues are solved with evidence."}</p>
      <form className="mt-4 space-y-3" onSubmit={async (e) => { e.preventDefault(); setBusy(true); setResult(await onGrade(answer)); setBusy(false); }}>
        <Textarea disabled={!ready} required rows={3} maxLength={2000} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Your conclusion" />
        <Button disabled={!ready || busy} className="bg-primary hover:bg-primary/90">{busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Submit final answer</Button>
        {result && !result.correct && <p className="text-sm text-destructive">{result.message}</p>}
      </form>
    </Card>
  );
}