import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
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

const visLabel = (v) => TEAM_VIS.find((x) => x[0] === v)?.[1];

function TeamCard({ t, action }) {
  return (
    <Card className="p-4 flex items-center gap-3">
      <Users className="w-5 h-5 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <Link to={`/teams/${t.id}`} className="font-display text-lg hover:underline">{t.name}</Link>
        <p className="text-xs text-muted-foreground truncate">{t.description || "No description"} · {t.member_ids?.length || 0}/8 members · captain {t.owner_username}</p>
      </div>
      <Badge variant="outline">{visLabel(t.visibility)}</Badge>
      {action}
    </Card>
  );
}

export default function Teams() {
  const nav = useNavigate();
  const { data: me } = useMe();
  const [code, setCode] = useState("");
  const [open, setOpen] = useState(false);
  const mine = useQuery({ queryKey: ["myTeams", me?.id], enabled: !!me, queryFn: async () => (await base44.entities.Team.filter({ member_ids: me.id }, { limit: 50 })).items });
  const all = useQuery({ queryKey: ["publicTeams"], queryFn: async () => (await base44.entities.Team.filter({ visibility: { $in: ["public", "invite"] } }, { sort: "-created_date", limit: 40 })).items });

  const call = async (body) => {
    try { return (await base44.functions.invoke("teamApi", body)).data; }
    catch (e) { toast({ title: e.response?.data?.error || "Something went wrong", variant: "destructive" }); }
  };
  const create = async (v) => { const d = await call({ action: "create", ...v }); if (d) nav(`/teams/${d.team.id}`); };
  const join = async (body) => { const d = await call({ action: "join", ...body }); if (d) nav(`/teams/${d.team.id}`); };
  const mineIds = new Set((mine.data || []).map((t) => t.id));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="font-display text-3xl">Teams</h1><p className="text-sm text-muted-foreground mt-1">Split the five clues, share evidence, solve together.</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="bg-primary hover:bg-primary/90"><Plus className="w-4 h-4 mr-1" />Create team</Button></DialogTrigger>
          <DialogContent><DialogHeader><DialogTitle>Create a team</DialogTitle></DialogHeader><TeamForm submitLabel="Create team" onSubmit={create} /></DialogContent>
        </Dialog>
      </div>
      <form className="flex gap-2 max-w-md" onSubmit={(e) => { e.preventDefault(); if (code.trim()) join({ code }); }}>
        <Input placeholder="Have an invite code?" value={code} onChange={(e) => setCode(e.target.value)} className="uppercase" />
        <Button type="submit" variant="outline">Join</Button>
      </form>
      <section className="space-y-3">
        <h2 className="font-display text-2xl">My teams</h2>
        {mine.isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : !mine.data?.length ? <p className="text-sm text-muted-foreground">You are not on a team yet.</p> : mine.data.map((t) => <TeamCard key={t.id} t={t} />)}
      </section>
      <section className="space-y-3">
        <h2 className="font-display text-2xl">Discover teams</h2>
        {(all.data || []).filter((t) => !mineIds.has(t.id)).map((t) => (
          <TeamCard key={t.id} t={t} action={t.visibility === "public"
            ? <Button size="sm" onClick={() => join({ team_id: t.id })}>Join</Button>
            : <span className="text-xs text-muted-foreground">Code needed</span>} />
        ))}
        {all.data && !all.data.filter((t) => !mineIds.has(t.id)).length && <p className="text-sm text-muted-foreground">No other listed teams yet.</p>}
      </section>
    </div>
  );
}