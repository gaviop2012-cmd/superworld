import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
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
  const [keyId, setKeyId] = useState(null);
  const [loading, setLoading] = useState(!!id);
  const [busy, setBusy] = useState("");
  const [report, setReport] = useState(null);
  const [links, setLinks] = useState(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const q = await base44.entities.Quest.get(id);
      const k = (await base44.entities.QuestKey.filter({ quest_id: id }, { limit: 1 })).items[0];
      setKeyId(k?.id || null);
      setF({
        quest: { ...emptyForm().quest, ...q },
        key: { final_answer: k?.final_answer || "", aliases: (k?.aliases || []).join(", "), explanation: k?.explanation || "", rights_ack: !!k?.rights_ack },
        clues: Array.from({ length: 5 }, (_, i) => {
          const c = q.clues?.[i] || {}, ck = k?.clue_keys?.[i] || {};
          return { ...emptyClue, ...c, sources: (c.sources || []).join("\n"), finding: ck.finding || "", keywords: (ck.keywords || []).join(", "), contribution: ck.contribution || "", evidence_excerpt: ck.evidence_excerpt || "", checked_on: ck.checked_on || "" };
        }),
      });
      setLoading(false);
    })();
  }, [id]);

  const setQuest = (p) => setF((s) => ({ ...s, quest: { ...s.quest, ...p } }));
  const setKey = (p) => setF((s) => ({ ...s, key: { ...s.key, ...p } }));
  const setClue = (i) => (c) => setF((s) => ({ ...s, clues: s.clues.map((x, j) => (j === i ? c : x)) }));

  const doctor = async () => {
    const urls = allUrls(f);
    let map = {};
    if (urls.length) {
      const { data } = await base44.functions.invoke("checkLinks", { urls });
      data.results.forEach((r) => { map[r.url] = r; });
    }
    setLinks(map);
    const r = runDoctor(f, map);
    setReport(r);
    return r;
  };

  const save = async (patch = {}, r = report) => {
    const quest = {
      ...f.quest, ...patch, creator_username: displayName(me),
      doctor_score: r?.score ?? f.quest.doctor_score ?? 0, doctor_passed: r ? r.canPublish : !!f.quest.doctor_passed,
      clues: f.clues.map((c) => ({ title: c.title, instruction: c.instruction, start_url: c.start_url, sources: splitLines(c.sources), submission_format: c.submission_format, hint1: c.hint1, hint2: c.hint2 })),
    };
    delete quest.id; delete quest.created_date; delete quest.updated_date; delete quest.created_by_id; delete quest.created_by; delete quest.is_sample;
    const key = {
      final_answer: f.key.final_answer, aliases: splitList(f.key.aliases), explanation: f.key.explanation, rights_ack: f.key.rights_ack,
      clue_keys: f.clues.map((c) => ({ finding: c.finding, keywords: splitList(c.keywords), contribution: c.contribution, evidence_excerpt: c.evidence_excerpt, checked_on: c.checked_on })),
    };
    let qid = id;
    if (id) await base44.entities.Quest.update(id, quest);
    else qid = (await base44.entities.Quest.create(quest)).id;
    if (keyId) await base44.entities.QuestKey.update(keyId, key);
    else setKeyId((await base44.entities.QuestKey.create({ quest_id: qid, ...key })).id);
    qc.invalidateQueries({ queryKey: ["myQuests"] });
    qc.invalidateQueries({ queryKey: ["quests"] });
    qc.invalidateQueries({ queryKey: ["quest", qid] });
    setQuest(patch);
    return qid;
  };

  const act = (name, fn) => async () => {
    setBusy(name);
    try { await fn(); } catch (e) { toast({ title: e.response?.data?.error || e.message || "Something went wrong", variant: "destructive" }); }
    setBusy("");
  };

  const onSave = act("save", async () => {
    const qid = await save();
    toast({ title: "Draft saved" });
    if (!id) nav(`/studio/${qid}`, { replace: true });
  });
  const onDoctor = act("doctor", doctor);
  const onPublish = act("publish", async () => {
    const r = await doctor();
    if (!r.canPublish) return toast({ title: "Quest Doctor found issues. Fix them and try again.", variant: "destructive" });
    const qid = await save({ status: "published", report_count: 0, validation_status: "Passed automated Quest Doctor; awaiting community playtests" }, r);
    toast({ title: f.quest.visibility === "private" ? "Saved as a private quest" : "Quest published" });
    nav(`/quest/${qid}`);
  });
  const onUnpublish = act("unpublish", async () => { await save({ status: "draft" }); toast({ title: "Moved back to draft" }); });

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
          {f.clues.map((c, i) => (
            <AccordionItem key={i} value={`c${i}`}>
              <AccordionTrigger>Clue {i + 1}{c.title ? ` · ${c.title}` : ""}</AccordionTrigger>
              <AccordionContent><ClueEditor clue={c} onChange={setClue(i)} /></AccordionContent>
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