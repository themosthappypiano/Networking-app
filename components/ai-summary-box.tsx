"use client";

import { Check, Copy, Sparkles } from "lucide-react";
import { useState } from "react";
import { FollowUp, Interaction, Person } from "@/types";

export function AISummaryBox({ person, interactions, followUps }: { person: Person; interactions: Interaction[]; followUps: FollowUp[] }) {
  const [copied, setCopied] = useState(false);
  const latest = [...interactions].sort((a, b) => b.date.localeCompare(a.date))[0];
  const next = [...followUps].filter((item) => item.status !== "Done").sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  const summary = `NETWORK CONTEXT: ${person.name}

RELATIONSHIP SUMMARY
${person.context.summary || "No AI summary generated yet."}

WHO THEY ARE
${person.name} is ${person.role || "a contact"}${person.business ? ` at ${person.business}` : ""}, based in ${person.location || "an unknown location"}. We are currently ${person.relationshipStatus.toLowerCase()} and my context level is ${person.contextLevel}/5.

WHAT THEY DO
${person.context.present || person.notes || "More context needed."}

WHAT THEY CARE ABOUT
Beliefs: ${person.context.beliefs || "Unknown."}
Drives: ${person.context.drives || "Unknown."}
Goals: ${person.context.future || "Unknown."}

HOW I KNOW THEM
${person.howWeMet || "Origin not recorded."}${person.introducedBy ? ` Introduced by ${person.introducedBy}.` : ""}

WHAT WE TALKED ABOUT
${latest ? `${latest.summary}. Key points: ${latest.keyPoints} Decisions: ${latest.decisions}` : "No interactions recorded yet."}

HOW I CAN HELP
${person.context.opportunities || "No opportunity recorded yet."}

RECOMMENDED NEXT ACTION
${next ? `${next.title} by ${next.dueDate}. ${next.notes}` : person.nextFollowUpDate ? `Reconnect by ${person.nextFollowUpDate}.` : "Define a useful, specific next step."}

THINGS TO REMEMBER
${person.context.risks || "None recorded."}`;

  async function copy() {
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/[0.08] via-panel to-panel shadow-glow">
      <div className="flex items-center justify-between border-b border-violet-400/10 px-5 py-4">
        <div className="flex items-center gap-2"><Sparkles size={16} className="text-violet-700" /><span className="text-sm font-semibold text-slate-950">AI-ready relationship brief</span></div>
        <button onClick={copy} className="button-secondary h-8 px-3 text-xs">{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? "Copied" : "Copy brief"}</button>
      </div>
      <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap p-5 font-sans text-sm leading-7 text-slate-600">{summary}</pre>
    </div>
  );
}
