import React from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, ExternalLink, Hand } from "lucide-react";

export default function TeamBoard({ board, titles }) {
  const subs = board?.submissions || [];
  if (!subs.length && !board?.claims?.length) return <p className="text-sm text-muted-foreground">No evidence yet. Open a quest as this team to start.</p>;
  return (
    <div className="space-y-3">
      {(board.claims || []).map((c) => (
        <p key={c.id} className="text-sm flex items-center gap-2"><Hand className="w-3.5 h-3.5 text-muted-foreground" /><b>{c.username}</b> claimed clue {c.clue_index} of <Link to={`/quest/${c.quest_id}`} className="text-primary hover:underline">{titles[c.quest_id] || "a quest"}</Link></p>
      ))}
      {subs.map((s) => (
        <div key={s.id} className="rounded-lg border p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            {s.correct ? <CheckCircle2 className="w-4 h-4 text-primary" /> : <XCircle className="w-4 h-4 text-muted-foreground" />}
            <Badge variant="secondary">{s.kind === "final" ? "Final answer" : `Clue ${s.clue_index}`}</Badge>
            <Link to={`/quest/${s.quest_id}`} className="text-primary hover:underline">{titles[s.quest_id] || "Quest"}</Link>
            <span className="text-muted-foreground">by {s.username}</span>
          </div>
          <p className="whitespace-pre-line">{s.text}</p>
          {s.source_url && <a href={s.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1"><ExternalLink className="w-3 h-3" />{s.source_url.replace(/^https?:\/\//, "").slice(0, 60)}</a>}
        </div>
      ))}
      {(board.comments || []).length > 0 && (
        <div className="pt-2 border-t space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Team notes</p>
          {board.comments.map((c) => <p key={c.id} className="text-sm"><b>{c.username}</b> <span className="text-muted-foreground">(clue {c.clue_index || "-"})</span>: {c.text}</p>)}
        </div>
      )}
    </div>
  );
}