"use client";

import { FormEvent, useState } from "react";
import { useNetwork } from "@/components/app-provider";
import { CommercialDocument, CommercialDocumentStatus, CommercialDocumentType } from "@/types";

const statuses: CommercialDocumentStatus[] = ["Draft", "Sent", "Viewed", "Accepted", "Declined", "Paid"];
const types: CommercialDocumentType[] = ["Proposal", "Invoice"];

export function CommercialDocumentForm({ document, defaultPersonId, onDone }: { document?: CommercialDocument; defaultPersonId?: string; onDone: () => void }) {
  const { people, saveDocument } = useNetwork();
  const [tags, setTags] = useState(document?.tags.join(", ") || "");
  const [form, setForm] = useState({
    id: document?.id,
    type: document?.type || "Proposal" as CommercialDocumentType,
    title: document?.title || "",
    amount: document?.amount || 0,
    currency: document?.currency || "EUR",
    status: document?.status || "Draft" as CommercialDocumentStatus,
    sentDate: document?.sentDate || new Date().toISOString().slice(0, 10),
    dueDate: document?.dueDate || "",
    personIds: document?.personIds || (defaultPersonId ? [defaultPersonId] : []),
    notes: document?.notes || "",
    link: document?.link || "",
  });

  function togglePerson(id: string) {
    setForm((current) => ({
      ...current,
      personIds: current.personIds.includes(id) ? current.personIds.filter((personId) => personId !== id) : [...current.personIds, id],
    }));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    saveDocument({ ...form, tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean) });
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label><span className="label">Type</span><select className="input" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as CommercialDocumentType })}>{types.map((type) => <option key={type}>{type}</option>)}</select></label>
        <label><span className="label">Status</span><select className="input" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as CommercialDocumentStatus })}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
      </div>
      <label><span className="label">Title</span><input required className="input" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="e.g. Community launch proposal" /></label>
      <div className="grid gap-4 sm:grid-cols-[1fr_.45fr]">
        <label><span className="label">Amount</span><input required type="number" min="0" step="0.01" className="input" value={form.amount} onChange={(event) => setForm({ ...form, amount: Number(event.target.value) })} /></label>
        <label><span className="label">Currency</span><input className="input" value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value.toUpperCase() })} placeholder="EUR" /></label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label><span className="label">Sent date</span><input type="date" className="input" value={form.sentDate} onChange={(event) => setForm({ ...form, sentDate: event.target.value })} /></label>
        <label><span className="label">Due date optional</span><input type="date" className="input" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} /></label>
      </div>
      <label><span className="label">Tags</span><input className="input" value={tags} onChange={(event) => setTags(event.target.value)} placeholder="website, retainer, warm lead" /></label>
      <label><span className="label">Document link optional</span><input type="url" className="input" value={form.link} onChange={(event) => setForm({ ...form, link: event.target.value })} placeholder="https://..." /></label>
      <div>
        <span className="label">Sent to</span>
        <div className="grid max-h-52 gap-2 overflow-y-auto rounded-xl border border-line bg-slate-50 p-3 sm:grid-cols-2">
          {people.map((person) => (
            <label key={person.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm text-slate-700 hover:bg-[#f2f7e8]">
              <input type="checkbox" checked={form.personIds.includes(person.id)} onChange={() => togglePerson(person.id)} className="accent-lime" />
              <span className="min-w-0"><span className="block truncate">{person.name}</span><span className="block truncate text-xs text-slate-500">{person.business || person.community}</span></span>
            </label>
          ))}
        </div>
      </div>
      <label><span className="label">Notes</span><textarea className="textarea" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Scope, terms, follow-up plan, objections..." /></label>
      <div className="flex justify-end gap-3 pt-3"><button type="button" onClick={onDone} className="button-secondary">Cancel</button><button className="button-primary">{document ? "Save changes" : "Add document"}</button></div>
    </form>
  );
}
