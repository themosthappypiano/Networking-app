import { ExternalLink, FileText, ReceiptText, Users } from "lucide-react";
import { CommercialDocument, Person } from "@/types";
import { Badge } from "@/components/ui";
import { formatDate } from "@/utils";

const statusStyle: Record<string, string> = {
  Draft: "border-slate-200 bg-slate-100 text-slate-700",
  Sent: "border-cyan-200 bg-cyan-50 text-cyan-700",
  Viewed: "border-violet-200 bg-violet-50 text-violet-700",
  Accepted: "border-lime/30 bg-lime/10 text-lime",
  Declined: "border-red-200 bg-red-50 text-red-700",
  Paid: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

export function CommercialDocumentCard({ document, people, onEdit }: { document: CommercialDocument; people: Person[]; onEdit: () => void }) {
  const recipients = people.filter((person) => document.personIds.includes(person.id));
  const formattedAmount = new Intl.NumberFormat("en", { style: "currency", currency: document.currency || "EUR" }).format(document.amount || 0);
  return (
    <article className="card p-5 transition hover:-translate-y-0.5 hover:border-slate-400">
      <div className="flex items-start justify-between gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-lime/10 text-lime">{document.type === "Invoice" ? <ReceiptText size={19} /> : <FileText size={19} />}</div>
        <Badge className={statusStyle[document.status]}>{document.status}</Badge>
      </div>
      <button onClick={onEdit} className="mt-5 block text-left">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-lime">{document.type} · {formatDate(document.sentDate)}</p>
        <h3 className="mt-2 text-lg font-semibold text-slate-950">{document.title}</h3>
      </button>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{formattedAmount}</p>
      <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">{document.notes || "No notes recorded."}</p>
      <div className="mt-4 flex flex-wrap gap-2">{document.tags.map((tag) => <Badge key={tag} className="border-line bg-transparent text-slate-500">#{tag}</Badge>)}</div>
      <div className="mt-5 flex items-center justify-between border-t border-line/60 pt-4">
        <span className="flex min-w-0 items-center gap-1.5 truncate text-xs text-slate-500"><Users size={13} />{recipients.map((person) => person.name).join(", ") || "No recipient"}</span>
        {document.link && <a href={document.link} target="_blank" rel="noreferrer" className="shrink-0 text-slate-500 hover:text-lime" aria-label="Open document"><ExternalLink size={15} /></a>}
      </div>
    </article>
  );
}
