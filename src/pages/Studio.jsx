import React from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { callApi } from "@/lib/anonymousApi";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Eye, Loader2, AlertTriangle } from "lucide-react";
import useMe from "@/lib/useMe";
import { LEVELS, QUEST_VIS } from "@/lib/constants";

const STATUS = { draft: "Draft", published: "Published", under_review: "Under review" };

export default function Studio() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["myQuests", me?.id],
    enabled: !!me,
    queryFn: async () => (await callApi("worldquestApi", { action: "myQuests" })).quests,
  });
  const remove = async (q) => {
    if (!confirm(`Delete "${q.title}" permanently?`)) return;
    await callApi("worldquestApi", { action: "deleteQuest", quest_id: q.id });
    qc.invalidateQueries({ queryKey: ["myQuests"] });
  };
  return (
    <div>
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl">Creator Studio</h1>
          <p className="text-muted-foreground text-sm mt-1">Anyone can build and publish a quest. The Quest Doctor checks quality before it goes live.</p>
        </div>
        <Button asChild className="bg-primary hover:bg-primary/90"><Link to="/studio/new"><Plus className="w-4 h-4 mr-1" />New quest</Link></Button>
      </div>
      {isLoading ? <Loader2 className="w-6 h-6 animate-spin mx-auto my-12" /> : !data?.length ? (
        <Card className="p-10 text-center text-muted-foreground">You have not created a quest yet.</Card>
      ) : (
        <div className="space-y-3">
          {data.map((q) => (
            <Card key={q.id} className="p-4 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[220px]">
                <p className="font-display text-lg">{q.title || "Untitled"}</p>
                <div className="flex flex-wrap gap-2 mt-1 items-center">
                  <Badge variant={q.status === "published" ? "default" : "secondary"}>{STATUS[q.status]}</Badge>
                  <Badge variant="outline">{QUEST_VIS.find((v) => v[0] === q.visibility)?.[1]}</Badge>
                  <span className="text-xs text-muted-foreground">L{q.difficulty} {LEVELS[q.difficulty]}{q.doctor_score ? ` · Doctor ${q.doctor_score}/100` : ""}</span>
                  {q.status === "under_review" && <span className="text-xs text-primary flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{q.report_count} reports. Fix and resubmit.</span>}
                </div>
              </div>
              <Button asChild variant="outline" size="sm"><Link to={`/quest/${q.id}`}><Eye className="w-4 h-4 mr-1" />View</Link></Button>
              <Button asChild variant="outline" size="sm"><Link to={`/studio/${q.id}`}><Pencil className="w-4 h-4 mr-1" />Edit</Link></Button>
              <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => remove(q)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
