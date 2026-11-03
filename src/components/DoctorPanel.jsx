import React from "react";
import { Card } from "@/components/ui/card";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { GROUP_LABELS } from "@/lib/questDoctor";

const ICON = { pass: <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />, warn: <AlertTriangle className="w-4 h-4 text-foreground shrink-0" />, fail: <XCircle className="w-4 h-4 text-destructive shrink-0" /> };

export default function DoctorPanel({ report }) {
  if (!report) return null;
  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-2xl">Quest Doctor report</h3>
        <div className="text-right">
          <p className="text-3xl font-display">{report.score}<span className="text-sm text-muted-foreground">/100</span></p>
          <p className={`text-xs ${report.canPublish ? "text-primary" : "text-destructive"}`}>
            {report.canPublish ? "Ready to publish" : report.critical.length ? `${report.critical.length} critical issue(s)` : "Score below 70"}
          </p>
        </div>
      </div>
      {Object.entries(GROUP_LABELS).map(([g, label]) => {
        const list = report.checks.filter((c) => c.group === g);
        if (!list.length) return null;
        return (
          <div key={g}>
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">{label}</p>
            <ul className="space-y-1.5">
              {list.map((c, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  {ICON[c.status]}
                  <span><b className="break-all">{c.label}</b> <span className="text-muted-foreground">{c.detail}</span>
                    {c.status !== "pass" && c.fix && <span className="block text-xs text-primary">Fix: {c.fix}</span>}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </Card>
  );
}