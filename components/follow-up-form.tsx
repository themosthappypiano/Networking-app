"use client";

import { FormEvent, useState } from "react";
import { useNetwork } from "@/components/app-provider";
import { ActionStatus, FollowUp, Priority } from "@/types";

export function FollowUpForm({ personId, followUp, onDone }: { personId: string; followUp?: FollowUp; onDone: () => void }) {
  const { deleteFollowUp, saveFollowUp } = useNetwork();
  const [form, setForm] = useState({
    id: followUp?.id,
    personId,
    title: followUp?.title || "",
    dueDate: followUp?.dueDate || "",
    priority: followUp?.priority || "Medium" as Priority,
    status: followUp?.status || "Todo" as ActionStatus,
    notes: followUp?.notes || "",
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    saveFollowUp(form);
    onDone();
  }

  function remove() {
    if (!followUp?.id) return;
    deleteFollowUp(followUp.id);
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label><span className="label">Action title</span><input required className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="What needs to happen next?" /></label>
      <div className="grid gap-4 sm:grid-cols-3">
        <label><span className="label">Due date</span><input required type="date" className="input" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></label>
        <label><span className="label">Priority</span><select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}>{["Low", "Medium", "High"].map((value) => <option key={value}>{value}</option>)}</select></label>
        <label><span className="label">Status</span><select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ActionStatus })}>{["Todo", "In progress", "Done"].map((value) => <option key={value}>{value}</option>)}</select></label>
      </div>
      <label><span className="label">Notes</span><textarea className="textarea" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
      <div className="flex flex-wrap justify-end gap-3 pt-3">
        {followUp?.id && <button type="button" onClick={remove} className="mr-auto rounded-xl border border-red-400/20 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50">Delete action</button>}
        <button type="button" onClick={onDone} className="button-secondary">Cancel</button>
        <button className="button-primary">Save action</button>
      </div>
    </form>
  );
}
