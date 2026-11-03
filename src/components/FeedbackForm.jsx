import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function FeedbackForm({ questId, onDone }) {
  const [rating, setRating] = useState(0);
  const [clarity, setClarity] = useState("clear");
  const [feel, setFeel] = useState("accurate");
  const [broken, setBroken] = useState(false);
  const [comment, setComment] = useState("");
  const [sent, setSent] = useState(false);
  if (sent) return <Card className="p-5 text-sm">Thanks for the feedback.</Card>;
  const send = async () => {
    if (!rating) return toast({ title: "Pick a star rating first", variant: "destructive" });
    await base44.entities.QuestFeedback.create({ quest_id: questId, rating, clarity, difficulty_feel: feel, broken_link: broken, comment });
    setSent(true);
    onDone?.();
  };
  return (
    <Card className="p-5 space-y-3">
      <h3 className="font-display text-xl">Rate this quest</h3>
      <div className="flex gap-1">{[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} stars`}><Star className={`w-6 h-6 ${n <= rating ? "fill-primary text-primary" : "text-muted-foreground"}`} /></button>
      ))}</div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Clarity</Label>
          <Select value={clarity} onValueChange={setClarity}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="clear">Clear</SelectItem><SelectItem value="okay">Okay</SelectItem><SelectItem value="confusing">Confusing</SelectItem></SelectContent></Select></div>
        <div><Label>Difficulty vs label</Label>
          <Select value={feel} onValueChange={setFeel}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="easier">Easier</SelectItem><SelectItem value="accurate">About right</SelectItem><SelectItem value="harder">Harder</SelectItem></SelectContent></Select></div>
      </div>
      <label className="flex items-center gap-2 text-sm"><Checkbox checked={broken} onCheckedChange={(v) => setBroken(!!v)} />A source link was broken</label>
      <Textarea maxLength={500} placeholder="Anything else? (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
      <Button onClick={send}>Send feedback</Button>
    </Card>
  );
}