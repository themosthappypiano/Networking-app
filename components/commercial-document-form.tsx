"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { FileUp, Loader2, Search } from "lucide-react";
import { useNetwork } from "@/components/app-provider";
import { CommercialDocument, CommercialDocumentStatus, CommercialDocumentType } from "@/types";
import { supabase } from "@/lib/supabase";

const statuses: CommercialDocumentStatus[] = ["Draft", "Sent", "Viewed", "Accepted", "Declined", "Paid"];
const types: CommercialDocumentType[] = ["Proposal", "Invoice"];

export function CommercialDocumentForm({ document, defaultPersonId, onDone }: { document?: CommercialDocument; defaultPersonId?: string; onDone: () => void }) {
  const { people, saveDocument } = useNetwork();
  const [tags, setTags] = useState(document?.tags.join(", ") || "");
  const [personSearch, setPersonSearch] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [analysisMessage, setAnalysisMessage] = useState("");
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

  async function analyzeInvoice(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setAnalyzing(true);
    setAnalysisError("");
    setAnalysisMessage("");
    try {
      const client = supabase;
      if (!client) throw new Error("Supabase is not configured.");
      const { data: sessionData, error: sessionError } = await client.auth.getSession();
      if (sessionError) throw sessionError;
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("Your session expired. Please sign in again.");

      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Could not read that invoice file."));
        reader.readAsDataURL(file);
      });

      const response = await fetch("/api/invoices/analyze", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          dataUrl,
          people: people.map((person) => ({
            id: person.id,
            name: person.name,
            business: person.business,
            community: person.community,
            role: person.role,
            tags: person.tags,
          })),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Invoice analysis failed.");

      setForm((current) => ({
        ...current,
        type: result.type || current.type,
        title: result.title || current.title || file.name.replace(/\.[^.]+$/, ""),
        amount: Number(result.amount || current.amount || 0),
        currency: String(result.currency || current.currency || "EUR").toUpperCase(),
        status: result.status || current.status,
        sentDate: result.sentDate || current.sentDate,
        dueDate: result.dueDate || current.dueDate,
        personIds: Array.isArray(result.personIds) && result.personIds.length ? result.personIds : current.personIds,
        notes: result.notes || current.notes,
      }));
      if (Array.isArray(result.tags)) setTags(result.tags.join(", "));
      setAnalysisMessage("Invoice analyzed. Review the fields before saving.");
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : "Invoice analysis failed.");
    } finally {
      setAnalyzing(false);
    }
  }

  const filteredPeople = people.filter((person) => {
    const query = personSearch.trim().toLowerCase();
    if (!query) return true;
    return `${person.name} ${person.business} ${person.community} ${person.role} ${person.tags.join(" ")}`.toLowerCase().includes(query);
  });

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="rounded-2xl border border-line bg-slate-50 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-950">Upload invoice or proposal</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">AI can read PDFs, images, and text documents, then prefill the amount, summary, dates, and likely recipient.</p>
          </div>
          <label className="button-secondary h-9 cursor-pointer px-3 text-xs">
            {analyzing ? <Loader2 size={14} className="animate-spin" /> : <FileUp size={14} />}
            {analyzing ? "Analyzing..." : "Analyze file"}
            <input type="file" accept=".pdf,image/*,.txt,.md,.csv,.doc,.docx" onChange={analyzeInvoice} disabled={analyzing} className="hidden" />
          </label>
        </div>
        {analysisMessage && <p className="mt-3 rounded-xl bg-white p-3 text-xs text-slate-600">{analysisMessage}</p>}
        {analysisError && <p className="mt-3 text-xs text-red-700">{analysisError}</p>}
      </div>
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
        <label className="relative mb-2 block">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input className="input h-10 bg-white pl-9 text-sm" value={personSearch} onChange={(event) => setPersonSearch(event.target.value)} placeholder="Search people..." />
        </label>
        <div className="grid max-h-52 gap-2 overflow-y-auto rounded-xl border border-line bg-slate-50 p-3 sm:grid-cols-2">
          {filteredPeople.map((person) => (
            <label key={person.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm text-slate-700 hover:bg-[#f2f7e8]">
              <input type="checkbox" checked={form.personIds.includes(person.id)} onChange={() => togglePerson(person.id)} className="accent-lime" />
              <span className="min-w-0"><span className="block truncate">{person.name}</span><span className="block truncate text-xs text-slate-500">{person.business || person.community}</span></span>
            </label>
          ))}
          {!filteredPeople.length && <p className="p-2 text-sm text-slate-500">No people match that search.</p>}
        </div>
      </div>
      <label><span className="label">Notes</span><textarea className="textarea" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Scope, terms, follow-up plan, objections..." /></label>
      <div className="flex justify-end gap-3 pt-3"><button type="button" onClick={onDone} className="button-secondary">Cancel</button><button className="button-primary">{document ? "Save changes" : "Add document"}</button></div>
    </form>
  );
}
