import React from "react";
import { Link } from "react-router-dom";
import { Clock, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { catLabel, LEVELS } from "@/lib/constants";

export default function QuestCard({ quest, to }) {
  return (
    <Link to={to || `/quest/${quest.id}`} className="group block rounded-xl border bg-card p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all">
      <div className="flex items-center gap-2 mb-3">
        <Badge variant="secondary">{catLabel(quest.category)}</Badge>
        <Badge className="bg-primary hover:bg-primary">L{quest.difficulty} · {LEVELS[quest.difficulty]}</Badge>
      </div>
      <h3 className="font-display text-xl leading-snug group-hover:text-primary">{quest.title || "Untitled quest"}</h3>
      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{quest.tagline || quest.head_question}</p>
      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-4">
        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{quest.est_minutes || 25} min</span>
        <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />{quest.creator_username || "WorldQuest Library"}</span>
      </div>
    </Link>
  );
}