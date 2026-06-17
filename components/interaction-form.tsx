"use client";

import { FormEvent, useState } from "react";
import { useNetwork } from "@/components/app-provider";
import { INTERACTION_TYPES, InteractionType } from "@/types";

export function InteractionForm({ personId, onDone }: { personId: string; onDone: () => void }) {
  const { addInteraction } = useNetwork();
  const [form, setForm] = useState({
    personId,
    date: new Date().toISOString().slice(0, 10),
    type: "Call" as InteractionType,
    summary: "",
    keyPoints: "",
    decisions: "",
    actionsAgreed: "",
    personalDetails: "",
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    addInteraction(form);
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label><span className="label">Date</span><input type="date" required className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
        <label><span className="label">Type</span><select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as InteractionType })}>{INTERACTION_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
      </div>
      <label><span className="label">Summary</span><input required className="input" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} placeholder="What was this conversation about?" /></label>
      {[
        ["keyPoints", "Key points"],
        ["decisions", "Decisions made"],
        ["actionsAgreed", "Actions agreed"],
        ["personalDetails", "Personal details to remember"],
      ].map(([key, label]) => (
        <label key={key}><span className="label">{label}</span><textarea className="textarea" value={form[key as keyof typeof form]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></label>
      ))}
      <div className="flex justify-end gap-3 pt-3"><button type="button" onClick={onDone} className="button-secondary">Cancel</button><button className="button-primary">Save interaction</button></div>
    </form>
  );
}
