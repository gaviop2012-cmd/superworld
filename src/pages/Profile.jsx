import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/use-toast";
import { Copy } from "lucide-react";
import useMe, { displayName } from "@/lib/useMe";
import { rankFor, nextRank, xpOf } from "@/lib/constants";
import { callApi } from "@/lib/anonymousApi";
import { getPlayerIdentity, updatePlayerUsername } from "@/lib/playerIdentity";

export default function Profile() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const stats = useQuery({
    queryKey: ["stats", me?.id],
    enabled: !!me,
    queryFn: () => callApi("worldquestApi", { action: "stats" }),
  });
  const s = stats.data || { clues: 0, finals: 0, made: 0 };
  const xp = xpOf(s.clues, s.finals);
  const next = nextRank(xp);

  const saveName = async (e) => {
    e.preventDefault();
    const u = name.trim().replace(/[<>\\r\\n]/g, "");
    if (u.length < 3 || u.length > 24) return toast({ title: "Use 3-24 characters for your player name", variant: "destructive" });
    try {
      await callApi("playerApi", { action: "updateName", username: u });
      updatePlayerUsername(u);
      qc.setQueryData(["me"], getPlayerIdentity());
      toast({ title: "Player name saved" });
      setName("");
    } catch (error) {
      toast({ title: error.response?.data?.error || "Could not save player name", variant: "destructive" });
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-primary">{rankFor(xp)}</p>
        <h1 className="font-display text-4xl">{displayName(me)}</h1>
        <p className="text-sm text-muted-foreground">Anonymous player · no email or password</p>
        <div className="mt-3 rounded-lg border p-3 flex items-center justify-between gap-3">
          <div><p className="text-xs text-muted-foreground">Your Player ID</p><code className="font-semibold tracking-wider">{me?.id}</code></div>
          <Button size="sm" variant="outline" onClick={() => navigator.clipboard?.writeText(me?.id || "")}><Copy className="w-4 h-4 mr-1" />Copy ID</Button>
        </div>
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
        <h2 className="font-display text-xl mb-3">Player name</h2>
        <form onSubmit={saveName} className="flex gap-2">
          <Input placeholder={me?.username || "choose a player name"} value={name} onChange={(e) => setName(e.target.value)} />
          <Button type="submit">Save</Button>
        </form>
      </Card>
    </div>
  );
}
