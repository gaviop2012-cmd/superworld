import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import QuestCard from "@/components/QuestCard";
import { CATEGORIES, LEVELS } from "@/lib/constants";
import { callApi } from "@/lib/anonymousApi";

export default function Discover() {
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("all");
  const [lvl, setLvl] = useState("all");
  const { data, isLoading } = useQuery({
    queryKey: ["quests", search, cat, lvl],
    queryFn: async () => (await callApi("worldquestApi", {
      action: "listQuests",
      search: search.trim(),
      category: cat === "all" ? "" : cat,
      difficulty: lvl === "all" ? "" : Number(lvl),
    })).quests,
  });
  const quests = data || [];

  return (
    <div>
      <section className="rounded-2xl bg-primary text-primary-foreground px-6 py-12 md:px-12 mb-8">
        <p className="text-primary text-sm tracking-widest uppercase mb-3">Internet-wide mysteries</p>
        <h1 className="font-display text-4xl md:text-5xl max-w-2xl leading-tight">One mystery. Five clues. One evidence-backed answer.</h1>
        <p className="text-white/70 mt-4 max-w-xl">Follow real sources across the web, submit proof for each clue, then crack the head question. Solo or with a team.</p>
      </section>
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search quests" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger className="w-[190px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={lvl} onValueChange={setLvl}>
          <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All levels</SelectItem>
            {Object.entries(LEVELS).map(([v, l]) => <SelectItem key={v} value={v}>{v} · {l}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {isLoading ? <Loader2 className="w-6 h-6 animate-spin mx-auto my-12" /> : quests.length === 0 ? (
        <p className="text-center text-muted-foreground py-16">No quests match yet. Try the Creator Studio to publish one.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{quests.map((x) => <QuestCard key={x.id} quest={x} />)}</div>
      )}
    </div>
  );
}
