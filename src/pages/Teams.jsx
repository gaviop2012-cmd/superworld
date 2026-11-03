import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Users, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import TeamForm from "@/components/TeamForm";
import useMe from "@/lib/useMe";
import { TEAM_VIS } from "@/lib/constants";
import { callApi } from "@/lib/anonymousApi";

const visLabel = (value) => TEAM_VIS.find((item) => item[0] === value)?.[1];

function TeamCard({ team, action }) {
  return (
    <Card className="p-4 flex items-center gap-3">
      <Users className="w-5 h-5 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <Link to={`/teams/${team.id}`} className="font-display text-lg hover:underline">{team.name}</Link>
        <p className="text-xs text-muted-foreground truncate">{team.description || "No description"} · {team.member_ids?.length || 0}/8 members · captain {team.owner_username}</p>
      </div>
      <Badge variant="outline">{visLabel(team.visibility)}</Badge>
      {action}
    </Card>
  );
}

export default function Teams() {
  const nav = useNavigate();
  const { data: me } = useMe();
  const [code, setCode] = useState("");
  const [open, setOpen] = useState(false);
  const mine = useQuery({
    queryKey: ["myTeams", me?.id],
    enabled: !!me,
    queryFn: async () => (await callApi("teamApi", { action: "listMine" })).teams,
  });
  const all = useQuery({
    queryKey: ["publicTeams"],
    queryFn: async () => (await callApi("teamApi", { action: "listPublic" })).teams,
  });

  const call = async (body) => {
    try { return await callApi("teamApi", body); }
    catch (error) {
      toast({ title: error.response?.data?.error || "Something went wrong", variant: "destructive" });
      return null;
    }
  };
  const create = async (value) => {
    const data = await call({ action: "create", ...value });
    if (data) {
      setOpen(false);
      nav(`/teams/${data.team.id}`);
    }
  };
  const join = async (payload) => {
    const data = await call({ action: "join", ...payload });
    if (data) {
      mine.refetch();
      all.refetch();
      nav(`/teams/${data.team.id}`);
    }
  };
  const mineIds = new Set((mine.data || []).map((team) => team.id));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="font-display text-3xl">Teams</h1><p className="text-sm text-muted-foreground mt-1">Split the five clues, share evidence, solve together.</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="bg-primary hover:bg-primary/90"><Plus className="w-4 h-4 mr-1" />Create team</Button></DialogTrigger>
          <DialogContent><DialogHeader><DialogTitle>Create a team</DialogTitle></DialogHeader><TeamForm submitLabel="Create team" onSubmit={create} /></DialogContent>
        </Dialog>
      </div>
      <div className="max-w-md space-y-1">
        <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); if (code.trim()) join({ code }); }}>
          <Input placeholder="Have an invite code?" value={code} onChange={(event) => setCode(event.target.value)} className="uppercase" />
          <Button type="submit" variant="outline">Join</Button>
        </form>
        <p className="text-xs text-muted-foreground">Your Player ID is used automatically for team membership. Share it with a captain to be invited.</p>
      </div>
      <section className="space-y-3">
        <h2 className="font-display text-2xl">My teams</h2>
        {mine.isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : !mine.data?.length ? <p className="text-sm text-muted-foreground">You are not on a team yet.</p> : mine.data.map((team) => <TeamCard key={team.id} team={team} />)}
      </section>
      <section className="space-y-3">
        <h2 className="font-display text-2xl">Discover teams</h2>
        {(all.data || []).filter((team) => !mineIds.has(team.id)).map((team) => (
          <TeamCard key={team.id} team={team} action={team.visibility === "public"
            ? <Button size="sm" onClick={() => join({ team_id: team.id })}>Join</Button>
            : <span className="text-xs text-muted-foreground">Code needed</span>} />
        ))}
        {all.data && !all.data.filter((team) => !mineIds.has(team.id)).length && <p className="text-sm text-muted-foreground">No other listed teams yet.</p>}
      </section>
    </div>
  );
}
