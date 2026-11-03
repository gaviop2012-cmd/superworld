import React, { useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Clock, Eye, Users } from "lucide-react";
import ClueCard from "@/components/ClueCard";
import FinalAnswer from "@/components/FinalAnswer";
import ReportButton from "@/components/ReportButton";
import FeedbackForm from "@/components/FeedbackForm";
import useMe from "@/lib/useMe";
import { catLabel, LEVELS, QUEST_VIS } from "@/lib/constants";

export default function QuestPage() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const qc = useQueryClient();
  const { data: me } = useMe();
  const [teamId, setTeamId] = useState(sp.get("team") || "solo");

  const questQ = useQuery({ queryKey: ["quest", id], queryFn: () => base44.entities.Quest.get(id), retry: false });
  const teamsQ = useQuery({
    queryKey: ["myTeams", me?.id], enabled: !!me,
    queryFn: async () => (await base44.entities.Team.filter({ member_ids: me.id }, { limit: 50 })).items,
  });
  const progQ = useQuery({
    queryKey: ["progress", id, teamId, me?.id], enabled: !!me,
    queryFn: async () => {
      if (teamId === "solo") {
        const r = await base44.entities.Submission.filter({ quest_id: id, user_id: me.id, team_id: "" }, { limit: 100, sort: "-created_date" });
        return { submissions: r.items, claims: [], comments: [] };
      }
      return (await base44.functions.invoke("teamApi", { action: "board", team_id: teamId, quest_id: id })).data;
    },
  });
  const fbQ = useQuery({
    queryKey: ["feedback", id],
    queryFn: async () => (await base44.entities.QuestFeedback.filter({ quest_id: id }, { limit: 200 })).items,
  });

  if (questQ.isLoading) return <Loader2 className="w-6 h-6 animate-spin mx-auto my-16" />;
  const quest = questQ.data;
  if (questQ.isError || !quest) return <p className="text-center py-16">This quest was not found, or it is private.</p>;

  const prog = progQ.data || { submissions: [], claims: [], comments: [] };
  const solved = {};
  prog.submissions.filter((s) => s.correct && s.kind === "clue").forEach((s) => { solved[s.clue_index] = s; });
  const finalSub = prog.submissions.find((s) => s.correct && s.kind === "final");
  const ready = [1, 2, 3, 4, 5].every((n) => solved[n]);
  const team = teamId !== "solo" ? (teamsQ.data || []).find((t) => t.id === teamId) : null;
  const refresh = () => qc.invalidateQueries({ queryKey: ["progress", id] });

  const grade = async (payload) => {
    try {
      const { data } = await base44.functions.invoke("gradeSubmission", { quest_id: id, team_id: teamId === "solo" ? undefined : teamId, ...payload });
      refresh();
      return data;
    } catch (e) {
      return { correct: false, message: e.response?.data?.error || "Something went wrong" };
    }
  };
  const teamCall = async (body) => { await base44.functions.invoke("teamApi", { team_id: teamId, quest_id: id, ...body }); refresh(); };
  const ratings = fbQ.data || [];
  const avg = ratings.length ? (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(1) : null;
  const vis = QUEST_VIS.find((v) => v[0] === quest.visibility);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Badge variant="secondary">{catLabel(quest.category)}</Badge>
          <Badge className="bg-primary hover:bg-primary">Level {quest.difficulty} · {LEVELS[quest.difficulty]}</Badge>
          <Badge variant="outline" className="gap-1"><Eye className="w-3 h-3" />{vis?.[1]}</Badge>
          {quest.status !== "published" && <Badge variant="destructive">{quest.status === "under_review" ? "Under review" : "Draft preview"}</Badge>}
          <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />~{quest.est_minutes} min</span>
          {avg && <span className="text-xs text-muted-foreground">★ {avg} ({ratings.length})</span>}
        </div>
        <h1 className="font-display text-4xl leading-tight">{quest.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">by {quest.creator_username || "WorldQuest Library"}{quest.code ? ` · ${quest.code}` : ""}</p>
        <p className="mt-4 whitespace-pre-line">{quest.briefing}</p>
        <div className="mt-5 rounded-xl bg-primary text-primary-foreground p-5">
          <p className="text-xs uppercase tracking-widest text-primary">Head question</p>
          <p className="font-display text-xl mt-1">{quest.head_question}</p>
        </div>
        {quest.source_note && <p className="text-xs text-muted-foreground mt-3">{quest.source_note}</p>}
        {quest.validation_status && <p className="text-xs text-muted-foreground mt-1">Review status: {quest.validation_status}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Users className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm">Playing as</span>
        <Select value={teamId} onValueChange={setTeamId}>
          <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="solo">Solo</SelectItem>
            {(teamsQ.data || []).map((t) => <SelectItem key={t.id} value={t.id}>Team: {t.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {team && <Link className="text-sm text-primary hover:underline" to={`/teams/${team.id}`}>Open team room</Link>}
        <div className="ml-auto"><ReportButton questId={id} /></div>
      </div>

      {progQ.isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
        <div className="space-y-4">
          {(quest.clues || []).map((c, i) => {
            const n = i + 1;
            const locked = quest.clue_reveal === "sequential" && n > 1 && !solved[n - 1] && !solved[n];
            return (
              <ClueCard key={n} index={n} clue={c} solved={solved[n]} locked={locked} meId={me?.id}
                onGrade={(answer, source_url) => grade({ kind: "clue", clue_index: n, answer, source_url })}
                team={team ? {
                  isOwner: team.owner_id === me?.id,
                  claim: prog.claims.find((x) => x.clue_index === n),
                  comments: prog.comments.filter((x) => x.clue_index === n).reverse(),
                  onClaim: (release) => teamCall({ action: "claim", clue_index: n, release }).catch((e) => alert(e.response?.data?.error || "Could not claim")),
                  onComment: (text) => teamCall({ action: "comment", clue_index: n, text }),
                } : null} />
            );
          })}
          <FinalAnswer ready={ready} finalSub={finalSub} onGrade={(answer) => grade({ kind: "final", answer })} />
        </div>
      )}
      {finalSub && <FeedbackForm questId={id} onDone={() => qc.invalidateQueries({ queryKey: ["feedback", id] })} />}
    </div>
  );
}