import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import useMe, { displayName } from "@/lib/useMe";
import { rankFor, nextRank, xpOf } from "@/lib/constants";

export default function Profile() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const stats = useQuery({
    queryKey: ["stats", me?.id], enabled: !!me,
    queryFn: async () => {
      const [clues, finals, made] = await Promise.all([
        base44.entities.Submission.count({ user_id: me.id, kind: "clue", correct: true }),
        base44.entities.Submission.count({ user_id: me.id, kind: "final", correct: true }),
        base44.entities.Quest.count({ created_by_id: me.id, status: "published" }),
      ]);
      return { clues, finals, made };
    },
  });
  if (!me) return <Loader2 className="w-6 h-6 animate-spin mx-auto my-16" />;
  const s = stats.data || { clues: 0, finals: 0, made: 0 };
  const xp = xpOf(s.clues, s.finals);
  const next = nextRank(xp);

  const saveName = async (e) => {
    e.preventDefault();
    const u = name.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(u)) return toast({ title: "Use 3-20 lowercase letters, numbers or underscores", variant: "destructive" });
    await base44.auth.updateMe({ username: u });
    qc.invalidateQueries({ queryKey: ["me"] });
    toast({ title: "Username saved" });
    setName("");
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-primary">{rankFor(xp)}</p>
        <h1 className="font-display text-4xl">{displayName(me)}</h1>
        <p className="text-sm text-muted-foreground">{me.email}</p>
      </div>
      <Card className="p-5 space-y-3">
        <div className="flex justify-between text-sm"><span>{xp} XP</span><span>{next ? `${next[0] - xp} XP to ${next[1]}` : "Top rank"}</span></div>
        <Progress value={next ? (xp / next[0]) * 100 : 100} />
        <div className="grid grid-cols-3 text-center pt-2">
          <div><p className="font-display text-3xl">{s.clues}</p><p className="text-xs text-muted-foreground">Clues solved</p></div>
          <div><p className="font-display text-3xl">{s.finals}</p><p className="text-xs text-muted-foreground">Cases solved</p></div>
          <div><p className="font-display text-3xl">{s.made}</p><p className="text-xs text-muted-foreground">Quests published</p></div>
        </div>
        <p className="text-xs text-muted-foreground">XP comes only from verified evidence: 10 per clue, 50 per solved case.</p>
      </Card>
      <Card className="p-5">
        <h2 className="font-display text-xl mb-3">Username</h2>
        <form onSubmit={saveName} className="flex gap-2">
          <Input placeholder={me.username || "choose a username"} value={name} onChange={(e) => setName(e.target.value)} />
          <Button type="submit">Save</Button>
        </form>
      </Card>
    </div>
  );
}