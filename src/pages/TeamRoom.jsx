import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Crown, UserMinus, Copy, Settings, LogOut } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import TeamForm from "@/components/TeamForm";
import TeamBoard from "@/components/TeamBoard";
import QuestCard from "@/components/QuestCard";
import useMe from "@/lib/useMe";
import { TEAM_VIS, EVIDENCE_VIS } from "@/lib/constants";

export default function TeamRoom() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data: me } = useMe();
  const [code, setCode] = useState("");
  const [open, setOpen] = useState(false);
  const teamQ = useQuery({ queryKey: ["team", id], queryFn: () => base44.entities.Team.get(id), retry: false });
  const team = teamQ.data;
  const isMember = !!team && !!me && team.member_ids.includes(me.id);
  const isOwner = !!team && team.owner_id === me?.id;

  const boardQ = useQuery({
    queryKey: ["board", id, isMember], enabled: !!team && (isMember || team.evidence_visibility === "public"),
    queryFn: async () => {
      const d = (await base44.functions.invoke("teamApi", { action: "board", team_id: id })).data;
      const ids = [...new Set([...d.submissions, ...d.claims].map((x) => x.quest_id))];
      const titles = {};
      if (ids.length) (await base44.entities.Quest.filter({ id: { $in: ids } }, { limit: 50 })).items.forEach((q) => { titles[q.id] = q.title; });
      return { ...d, titles };
    },
  });
  const questsQ = useQuery({ queryKey: ["quests-pick"], enabled: isMember, queryFn: async () => (await base44.entities.Quest.filter({ status: "published", visibility: "public" }, { limit: 6, sort: "difficulty" })).items });

  const call = async (body, msg) => {
    try {
      const d = (await base44.functions.invoke("teamApi", { team_id: id, ...body })).data;
      qc.invalidateQueries({ queryKey: ["team", id] }); qc.invalidateQueries({ queryKey: ["myTeams"] }); qc.invalidateQueries({ queryKey: ["board", id] });
      if (msg) toast({ title: msg });
      return d;
    } catch (e) { toast({ title: e.response?.data?.error || "Something went wrong", variant: "destructive" }); }
  };
  const showCode = async () => { const d = await call({ action: "getCode" }); if (d) setCode(d.code); };

  if (teamQ.isLoading) return <Loader2 className="w-6 h-6 animate-spin mx-auto my-16" />;
  if (teamQ.isError || !team) return <p className="text-center py-16">Team not found, or it is hidden. Ask the captain for an invite code.</p>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <div className="flex flex-wrap gap-2 mb-2">
          <Badge variant="outline">{TEAM_VIS.find((v) => v[0] === team.visibility)?.[1]}</Badge>
          <Badge variant="outline">Evidence: {EVIDENCE_VIS.find((v) => v[0] === team.evidence_visibility)?.[1]}</Badge>
        </div>
        <h1 className="font-display text-4xl">{team.name}</h1>
        <p className="text-muted-foreground mt-1">{team.description}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {!isMember && team.visibility === "public" && <Button onClick={async () => (await call({ action: "join" }, "Joined")) }>Join team</Button>}
        {isOwner && (
          <>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button variant="outline"><Settings className="w-4 h-4 mr-1" />Settings</Button></DialogTrigger>
              <DialogContent><DialogHeader><DialogTitle>Team settings</DialogTitle></DialogHeader>
                <TeamForm initial={team} submitLabel="Save" onSubmit={async (v) => { if (await call({ action: "update", ...v }, "Saved")) setOpen(false); }} /></DialogContent>
            </Dialog>
            <Button variant="outline" onClick={showCode}>Show invite code</Button>
          </>
        )}
        {isMember && <Button variant="ghost" onClick={async () => { if (await call({ action: "leave" }, "You left the team")) nav("/teams"); }}><LogOut className="w-4 h-4 mr-1" />Leave</Button>}
      </div>
      {code && (
        <Card className="p-4 flex items-center gap-3">
          <span className="text-sm">Invite code</span><code className="text-xl tracking-widest font-bold">{code}</code>
          <Button size="icon" variant="ghost" aria-label="Copy" onClick={() => { navigator.clipboard.writeText(code); toast({ title: "Copied" }); }}><Copy className="w-4 h-4" /></Button>
        </Card>
      )}

      <Card className="p-5">
        <h2 className="font-display text-xl mb-3">Members ({team.members.length}/8)</h2>
        <ul className="space-y-2">
          {team.members.map((m) => (
            <li key={m.user_id} className="flex items-center gap-2 text-sm">
              {m.role === "captain" && <Crown className="w-4 h-4 text-primary" />}<span className="flex-1">{m.username}</span>
              {isOwner && m.user_id !== me.id && <Button size="sm" variant="ghost" onClick={() => call({ action: "kick", user_id: m.user_id }, "Member removed")}><UserMinus className="w-4 h-4" /></Button>}
            </li>
          ))}
        </ul>
      </Card>

      {isMember && questsQ.data?.length > 0 && (
        <div>
          <h2 className="font-display text-xl mb-3">Play a quest as this team</h2>
          <div className="grid sm:grid-cols-2 gap-3">{questsQ.data.map((q) => <QuestCard key={q.id} quest={q} to={`/quest/${q.id}?team=${id}`} />)}</div>
        </div>
      )}

      <div>
        <h2 className="font-display text-xl mb-3">Evidence board</h2>
        {boardQ.isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : boardQ.data ? <TeamBoard board={boardQ.data} titles={boardQ.data.titles} /> : <p className="text-sm text-muted-foreground">The evidence board is private to team members.</p>}
      </div>
    </div>
  );
}