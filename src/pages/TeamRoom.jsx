import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Crown, UserMinus, Copy, Settings, LogOut, UserPlus } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import TeamForm from "@/components/TeamForm";
import TeamBoard from "@/components/TeamBoard";
import QuestCard from "@/components/QuestCard";
import useMe from "@/lib/useMe";
import { TEAM_VIS, EVIDENCE_VIS } from "@/lib/constants";
import { callApi } from "@/lib/anonymousApi";

export default function TeamRoom() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data: me } = useMe();
  const [code, setCode] = useState("");
  const [open, setOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [targetPlayerId, setTargetPlayerId] = useState("");
  const teamQ = useQuery({
    queryKey: ["team", id, me?.id],
    enabled: !!me,
    queryFn: () => callApi("teamApi", { action: "get", team_id: id }),
    retry: false,
  });
  const team = teamQ.data?.team;
  const isMember = !!teamQ.data?.isMember;
  const isOwner = !!team && team.owner_id === me?.id;

  const boardQ = useQuery({
    queryKey: ["board", id, isMember],
    enabled: !!team && (isMember || team.evidence_visibility === "public"),
    queryFn: async () => {
      const data = await callApi("teamApi", { action: "board", team_id: id });
      const ids = [...new Set([...data.submissions, ...data.claims].map((item) => item.quest_id).filter(Boolean))];
      const titles = {};
      await Promise.all(ids.map(async (questId) => {
        try {
          const result = await callApi("worldquestApi", { action: "getQuest", quest_id: questId });
          titles[questId] = result.quest.title;
        } catch { /* Keep the evidence visible if its quest has since been removed. */ }
      }));
      return { ...data, titles };
    },
  });
  const questsQ = useQuery({
    queryKey: ["quests-pick"],
    enabled: isMember,
    queryFn: async () => (await callApi("worldquestApi", { action: "listQuests" })).quests.slice(0, 6),
  });

  const call = async (body, message) => {
    try {
      const data = await callApi("teamApi", { team_id: id, ...body });
      qc.invalidateQueries({ queryKey: ["team", id] });
      qc.invalidateQueries({ queryKey: ["myTeams"] });
      qc.invalidateQueries({ queryKey: ["publicTeams"] });
      qc.invalidateQueries({ queryKey: ["board", id] });
      if (message) toast({ title: message });
      return data;
    } catch (error) {
      toast({ title: error.response?.data?.error || "Something went wrong", variant: "destructive" });
      return null;
    }
  };
  const showCode = async () => { const data = await call({ action: "getCode" }); if (data) setCode(data.code); };
  const invite = async (event) => {
    event.preventDefault();
    const data = await call({ action: "invite", target_player_id: targetPlayerId });
    if (data) {
      setTargetPlayerId("");
      setInviteOpen(false);
      toast({ title: "Player added to the team" });
    }
  };

  if (teamQ.isLoading) return <Loader2 className="w-6 h-6 animate-spin mx-auto my-16" />;
  if (teamQ.isError || !team) return <p className="text-center py-16">Team not found, or it is hidden. Ask the captain for an invite code.</p>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <div className="flex flex-wrap gap-2 mb-2">
          <Badge variant="outline">{TEAM_VIS.find((value) => value[0] === team.visibility)?.[1]}</Badge>
          <Badge variant="outline">Evidence: {EVIDENCE_VIS.find((value) => value[0] === team.evidence_visibility)?.[1]}</Badge>
        </div>
        <h1 className="font-display text-4xl">{team.name}</h1>
        <p className="text-muted-foreground mt-1">{team.description}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {!isMember && team.visibility === "public" && <Button onClick={async () => { const data = await call({ action: "join" }, "Joined"); if (data) qc.invalidateQueries({ queryKey: ["team", id] }); }}>Join team</Button>}
        {isOwner && (
          <>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button variant="outline"><Settings className="w-4 h-4 mr-1" />Settings</Button></DialogTrigger>
              <DialogContent><DialogHeader><DialogTitle>Team settings</DialogTitle></DialogHeader>
                <TeamForm initial={team} submitLabel="Save" onSubmit={async (value) => { if (await call({ action: "update", ...value }, "Saved")) setOpen(false); }} /></DialogContent>
            </Dialog>
            <Button variant="outline" onClick={showCode}>Show invite code</Button>
            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
              <DialogTrigger asChild><Button variant="outline"><UserPlus className="w-4 h-4 mr-1" />Invite by Player ID</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Invite a player</DialogTitle></DialogHeader>
                <form className="space-y-3" onSubmit={invite}>
                  <Input value={targetPlayerId} onChange={(event) => setTargetPlayerId(event.target.value.toUpperCase())} placeholder="WQ-XXXXXXXXXXXX" maxLength={15} required />
                  <p className="text-xs text-muted-foreground">Ask the player to copy their Player ID from their Profile page.</p>
                  <Button type="submit" className="w-full">Add player</Button>
                </form>
              </DialogContent>
            </Dialog>
          </>
        )}
        {isMember && <Button variant="ghost" onClick={async () => { const data = await call({ action: "leave" }, "You left the team"); if (data) nav("/teams"); }}><LogOut className="w-4 h-4 mr-1" />Leave</Button>}
      </div>
      {code && (
        <Card className="p-4 flex items-center gap-3">
          <span className="text-sm">Invite code</span><code className="text-xl tracking-widest font-bold">{code}</code>
          <Button size="icon" variant="ghost" aria-label="Copy" onClick={() => { navigator.clipboard.writeText(code); toast({ title: "Copied" }); }}><Copy className="w-4 h-4" /></Button>
        </Card>
      )}

      <Card className="p-5">
        <h2 className="font-display text-xl mb-3">Members ({team.members?.length || 0}/8)</h2>
        <ul className="space-y-3">
          {(team.members || []).map((member) => {
            const memberId = member.player_id || member.user_id;
            return (
              <li key={memberId} className="flex items-center gap-2 text-sm">
                {member.role === "captain" && <Crown className="w-4 h-4 text-primary" />}
                <span className="flex-1 min-w-0"><b>{member.username}</b><span className="block text-xs text-muted-foreground">{memberId}</span></span>
                {isOwner && memberId !== me.id && <Button size="sm" variant="ghost" onClick={() => call({ action: "kick", target_player_id: memberId }, "Member removed")}><UserMinus className="w-4 h-4" /></Button>}
              </li>
            );
          })}
        </ul>
      </Card>

      {isMember && questsQ.data?.length > 0 && (
        <div>
          <h2 className="font-display text-xl mb-3">Play a quest as this team</h2>
          <div className="grid sm:grid-cols-2 gap-3">{questsQ.data.map((quest) => <QuestCard key={quest.id} quest={quest} to={`/quest/${quest.id}?team=${id}`} />)}</div>
        </div>
      )}

      <div>
        <h2 className="font-display text-xl mb-3">Evidence board</h2>
        {boardQ.isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : boardQ.data ? <TeamBoard board={boardQ.data} titles={boardQ.data.titles} /> : <p className="text-sm text-muted-foreground">The evidence board is private to team members.</p>}
      </div>
    </div>
  );
}
