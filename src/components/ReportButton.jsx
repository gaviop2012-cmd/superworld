import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { Flag } from "lucide-react";
import { REPORT_REASONS } from "@/lib/constants";

export default function ReportButton({ questId }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("broken_link");
  const [details, setDetails] = useState("");
  const send = async () => {
    try {
      const { data } = await base44.functions.invoke("reportQuest", { quest_id: questId, reason, details });
      toast({ title: data.unlisted ? "Report received. This quest is now under review." : "Report received. Thank you." });
      setOpen(false);
    } catch (e) {
      toast({ title: e.response?.data?.error || "Could not send report", variant: "destructive" });
    }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="ghost" size="sm"><Flag className="w-4 h-4 mr-1" />Report</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Report this quest</DialogTitle></DialogHeader>
        <Select value={reason} onValueChange={setReason}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{REPORT_REASONS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
        </Select>
        <Textarea maxLength={500} placeholder="Details (optional)" value={details} onChange={(e) => setDetails(e.target.value)} />
        <p className="text-xs text-muted-foreground">Quests with three separate reports are automatically pulled for review until the creator fixes them.</p>
        <Button onClick={send}>Send report</Button>
      </DialogContent>
    </Dialog>
  );
}