"use client";

import { FilePlus2, FileText } from "lucide-react";
import { useMemo, useState } from "react";
import { CommercialDocumentCard } from "@/components/commercial-document-card";
import { CommercialDocumentForm } from "@/components/commercial-document-form";
import { EmptyState, Modal } from "@/components/ui";
import { useNetwork } from "@/components/app-provider";
import { CommercialDocument, CommercialDocumentStatus, CommercialDocumentType } from "@/types";

export default function InvoicesPage() {
  const { documents, people } = useNetwork();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CommercialDocument>();
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => documents.filter((document) => {
    const recipients = people.filter((person) => document.personIds.includes(person.id)).map((person) => person.name).join(" ");
    const haystack = `${document.title} ${document.notes} ${document.tags.join(" ")} ${recipients}`.toLowerCase();
    return (!type || document.type === type)
      && (!status || document.status === status)
      && (!search || haystack.includes(search.toLowerCase()));
  }).sort((a, b) => b.sentDate.localeCompare(a.sentDate)), [documents, people, search, status, type]);

  const totalSent = documents.filter((document) => ["Sent", "Viewed", "Accepted", "Paid"].includes(document.status)).reduce((sum, document) => sum + document.amount, 0);

  function addNew() {
    setEditing(undefined);
    setOpen(true);
  }

  return (
    <>
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-lime">Revenue memory</p><h1 className="text-3xl font-semibold tracking-[-0.03em] text-slate-950">Invoices & proposals</h1><p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">Track what you sent, who received it, when it went out, and how much is on the table.</p></div>
        <button onClick={addNew} className="button-primary"><FilePlus2 size={16} /> Add document</button>
      </div>
      <div className="mb-5 grid gap-3 md:grid-cols-3">
        <div className="card p-4"><p className="text-xs text-slate-500">Documents</p><p className="mt-2 text-2xl font-semibold text-slate-950">{documents.length}</p></div>
        <div className="card p-4"><p className="text-xs text-slate-500">Sent value</p><p className="mt-2 text-2xl font-semibold text-slate-950">{new Intl.NumberFormat("en", { style: "currency", currency: "EUR" }).format(totalSent)}</p></div>
        <div className="card p-4"><p className="text-xs text-slate-500">Paid</p><p className="mt-2 text-2xl font-semibold text-slate-950">{documents.filter((document) => document.status === "Paid").length}</p></div>
      </div>
      <div className="card mb-5 flex flex-col gap-2 p-3 lg:flex-row">
        <input className="input lg:flex-1" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search documents, people, tags..." />
        <select className="input lg:w-44" value={type} onChange={(event) => setType(event.target.value)}><option value="">All types</option>{(["Proposal", "Invoice"] as CommercialDocumentType[]).map((value) => <option key={value}>{value}</option>)}</select>
        <select className="input lg:w-44" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{(["Draft", "Sent", "Viewed", "Accepted", "Declined", "Paid"] as CommercialDocumentStatus[]).map((value) => <option key={value}>{value}</option>)}</select>
      </div>
      {filtered.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{filtered.map((document) => <CommercialDocumentCard key={document.id} document={document} people={people} onEdit={() => { setEditing(document); setOpen(true); }} />)}</div> : <EmptyState icon={<FileText size={19} />} title="No invoices or proposals yet" body="Add the first document you sent so follow-up and revenue context live beside your relationships." />}
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? `Edit ${editing.title}` : "Add invoice or proposal"} description="Track the commercial context attached to your relationships." wide><CommercialDocumentForm document={editing} onDone={() => setOpen(false)} /></Modal>
    </>
  );
}
