import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2, Save, Stethoscope, Rocket, EyeOff } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import QuestFields from "@/components/QuestFields";
import ClueEditor from "@/components/ClueEditor";
import DoctorPanel from "@/components/DoctorPanel";
import useMe, { displayName } from "@/lib/useMe";
import { runDoctor, allUrls, splitLines, splitList } from "@/lib/questDoctor";
import { callApi } from "@/lib/anonymousApi";

const emptyClue = { title: "", instruction: "", start_url: "", sources: "", submission_format: "", hint1: "", hint2: "", finding: "", keywords: "", contribution: "", evidence_excerpt: "", checked_on: "" };
const emptyForm = () => ({
  quest: { title: "", tagline: "", briefing: "", head_question: "", category: "general", difficulty: 2, est_minutes: 25, language: "English", visibility: "public", clue_reveal: "all", source_note: "", status: "draft" },
  key: { final_answer: "", aliases: "", explanation: "", rights_ack: false },
  clues: Array.from({ length: 5 }, () => ({ ...emptyClue })),
});

export default function QuestEditor() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data: me } = useMe();
  const [f, setF] = useState(emptyForm());
  const [loading, setLoading] = useState(!!id);
  const [busy, setBusy] = useState("");
  const [report, setReport] = useState(null);
  const [links, setLinks] = useState(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    (async () => {
      try {
        const data = await callApi("worldquestApi", { action: "loadEditor", quest_id: id });
        const quest = data.quest;
        const key = data.key || {};
        if (!active) return;
        setF({
          quest: { ...emptyForm().quest, ...quest },
          key: { final_answer: key.final_answer || "", aliases: (key.aliases || []).join(", "), explanation: key.explanation || "", rights_ack: !!key.rights_ack },
          clues: Array.from({ length: 5 }, (_, index) => {
            const clue = quest.clues?.[index] || {}, clueKey = key.clue_keys?.[index] || {};
            return {
              ...emptyClue, ...clue,
              sources: (clue.sources || []).join("\n"),
              finding: clueKey.finding || "",
              keywords: (clueKey.keywords || []).join(", "),
              contribution: clueKey.contribution || "",
              evidence_excerpt: clueKey.evidence_excerpt || "",
              checked_on: clueKey.checked_on || "",
            };
          }),
        });
      } catch (error) {
        toast({ title: error.response?.data?.error || "Could not open this quest", variant: "destructive" });
        nav("/studio", { replace: true });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [id, nav]);

  const setQuest = (patch) => setF((state) => ({ ...state, quest: { ...state.quest, ...patch } }));
  const setKey = (patch) => setF((state) => ({ ...state, key: { ...state.key, ...patch } }));
  const setClue = (index) => (clue) => setF((state) => ({ ...state, clues: state.clues.map((item, current) => current === index ? clue : item) }));

  const doctor = async () => {
    const urls = allUrls(f);
    const map = {};
    if (urls.length) {
      const data = await callApi("checkLinks", { urls });
      data.results.forEach((result) => { map[result.url] = result; });
    }
    setLinks(map);
    const result = runDoctor(f, map);
    setReport(result);
    return result;
  };

  const save = async (patch = {}, result = report) => {
    const quest = {
      ...f.quest, ...patch, creator_username: displayName(me),
      doctor_score: result?.score ?? f.quest.doctor_score ?? 0,
      doctor_passed: result ? result.canPublish : !!f.quest.doctor_passed,
      clues: f.clues.map((clue) => ({
        title: clue.title, instruction: clue.instruction, start_url: clue.start_url,
        sources: splitLines(clue.sources), submission_format: clue.submission_format,
        hint1: clue.hint1, hint2: clue.hint2,
      })),
    };
    const key = {
      final_answer: f.key.final_answer, aliases: splitList(f.key.aliases),
      explanation: f.key.explanation, rights_ack: f.key.rights_ack,
      clue_keys: f.clues.map((clue) => ({
        finding: clue.finding, keywords: splitList(clue.keywords), contribution: clue.contribution,
        evidence_excerpt: clue.evidence_excerpt, checked_on: clue.checked_on,
      })),
    };
    const data = await callApi("worldquestApi", { action: "saveQuest", quest_id: id, quest, key });
    const questId = data.quest_id;
    qc.invalidateQueries({ queryKey: ["myQuests"] });
    qc.invalidateQueries({ queryKey: ["quests"] });
    qc.invalidateQueries({ queryKey: ["quest", questId] });
    setQuest(patch);
    return questId;
  };

  const act = (name, fn) => async () => {
    setBusy(name);
    try { await fn(); }
    catch (error) { toast({ title: error.response?.data?.error || error.message || "Something went wrong", variant: "destructive" }); }
    setBusy("");
  };

  const onSave = act("save", async () => {
    const questId = await save();
    toast({ title: "Draft saved" });
    if (!id) nav(`/studio/${questId}`, { replace: true });
  });
  const onDoctor = act("doctor", doctor);
  const onPublish = act("publish", async () => {
    const result = await doctor();
    if (!result.canPublish) return toast({ title: "Quest Doctor found issues. Fix them and try again.", variant: "destructive" });
    const questId = await save({
      status: "published", report_count: 0,
      validation_status: "Passed automated Quest Doctor; awaiting community playtests",
    }, result);
    toast({ title: f.quest.visibility === "private" ? "Saved as a private quest" : "Quest published" });
    nav(`/quest/${questId}`);
  });
  const onUnpublish = act("unpublish", async () => {
    await save({ status: "draft" });
    toast({ title: "Moved back to draft" });
  });

  if (loading) return <Loader2 className="w-6 h-6 animate-spin mx-auto my-16" />;
  const published = f.quest.status === "published";
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="font-display text-3xl">{id ? "Edit quest" : "New quest"}</h1>
      {f.quest.status === "under_review" && <Card className="p-4 bg-primary/10 border-primary/40 text-sm">This quest was pulled after community reports. Fix the problems, then publish again to resubmit it.</Card>}
      <QuestFields f={f} setQuest={setQuest} setKey={setKey} />
      <div>
        <h2 className="font-display text-2xl mb-2">The five clues</h2>
        <Accordion type="multiple" defaultValue={["c0"]} className="border rounded-lg px-4">
          {f.clues.map((clue, index) => (
            <AccordionItem key={index} value={`c${index}`}>
              <AccordionTrigger>Clue {index + 1}{clue.title ? ` · ${clue.title}` : ""}</AccordionTrigger>
              <AccordionContent><ClueEditor clue={clue} onChange={setClue(index)} /></AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
      <div className="flex flex-wrap gap-3 sticky bottom-4 bg-background/90 backdrop-blur p-3 rounded-lg border">
        <Button variant="outline" onClick={onSave} disabled={!!busy || !f.quest.title.trim()}>{busy === "save" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}Save draft</Button>
        <Button variant="outline" onClick={onDoctor} disabled={!!busy}>{busy === "doctor" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Stethoscope className="w-4 h-4 mr-2" />}Run Quest Doctor</Button>
        <Button className="bg-primary hover:bg-primary/90" onClick={onPublish} disabled={!!busy || !f.quest.title.trim()}>{busy === "publish" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Rocket className="w-4 h-4 mr-2" />}{published ? "Re-check & update" : "Publish"}</Button>
        {published && <Button variant="ghost" onClick={onUnpublish} disabled={!!busy}><EyeOff className="w-4 h-4 mr-2" />Unpublish</Button>}
      </div>
      <DoctorPanel report={report} />
    </div>
  );
}
