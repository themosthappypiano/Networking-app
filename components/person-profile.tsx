"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bot, CalendarClock, Edit3, ImagePlus, Link2, MapPin, MessageSquareText, Plus, ReceiptText, Trash2, UserRound } from "lucide-react";
import { useState } from "react";
import { useNetwork } from "@/components/app-provider";
import { AISummaryBox } from "@/components/ai-summary-box";
import { FollowUpForm } from "@/components/follow-up-form";
import { FollowUpList } from "@/components/follow-up-list";
import { InteractionForm } from "@/components/interaction-form";
import { InteractionTimeline } from "@/components/interaction-timeline";
import { CommercialDocumentCard } from "@/components/commercial-document-card";
import { CommercialDocumentForm } from "@/components/commercial-document-form";
import { PersonForm } from "@/components/person-form";
import { Avatar, Badge, ContextMeter, EmptyState, FocusBadge, Modal, SectionHeading } from "@/components/ui";
import { CommercialDocument, FollowUp } from "@/types";
import { formatDate } from "@/utils";

const tabs = [
  { id: "overview", label: "Overview", icon: UserRound },
  { id: "context", label: "Context", icon: Bot },
  { id: "interactions", label: "Interactions", icon: MessageSquareText },
  { id: "actions", label: "Follow-ups", icon: CalendarClock },
  { id: "documents", label: "Invoices", icon: ReceiptText },
  { id: "connections", label: "Connections", icon: Link2 },
  { id: "ai", label: "AI Summary", icon: Bot },
] as const;

type Tab = (typeof tabs)[number]["id"];

export function PersonProfile({ personId }: { personId: string }) {
  const router = useRouter();
  const { people, interactions, followUps, events, documents, deletePerson } = useNetwork();
  const person = people.find((item) => item.id === personId);
  const [tab, setTab] = useState<Tab>("overview");
  const [editOpen, setEditOpen] = useState(false);
  const [interactionOpen, setInteractionOpen] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);
  const [documentOpen, setDocumentOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<CommercialDocument>();
  const [editingAction, setEditingAction] = useState<FollowUp>();

  if (!person) return <EmptyState icon={<UserRound size={20} />} title="Person not found" body="This contact may have been removed or the link is invalid." action={<Link href="/people" className="button-secondary">Back to people</Link>} />;
  const personInteractions = interactions.filter((item) => item.personId === person.id);
  const personFollowUps = followUps.filter((item) => item.personId === person.id);
  const personDocuments = documents.filter((item) => item.personIds.includes(person.id));
  const connected = people.filter((item) => person.connectedPeopleIds.includes(item.id));
  const sharedEvents = events.filter((event) => person.eventIds.includes(event.id));
  const personName = person.name;
  const activePersonId = person.id;

  function remove() {
    if (confirm(`Delete ${personName} and their interactions and actions?`)) {
      deletePerson(activePersonId);
      router.push("/people");
    }
  }

  return (
    <>
      <Link href="/people" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-slate-950"><ArrowLeft size={15} /> Back to people</Link>
      <div className="card overflow-hidden">
        <div className="px-5 pb-6 pt-6 sm:px-7 sm:pt-7">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="w-fit rounded-full border-4 border-white bg-white shadow-md"><Avatar initials={person.initials} color={person.avatarColor} photoUrl={person.avatarUrl} size="2xl" /></div>
              <div><h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{person.name}</h1><p className="mt-2 text-sm text-slate-600">{person.role}{person.business && ` at ${person.business}`}</p><p className="mt-3 flex items-center gap-1.5 text-xs text-slate-600"><MapPin size={12} />{person.location} · {person.community}</p></div>
            </div>
            <div className="flex gap-2"><button onClick={() => setEditOpen(true)} className="button-secondary"><Edit3 size={15} /> Edit</button><button onClick={remove} className="grid h-10 w-10 place-items-center rounded-xl border border-red-400/15 text-slate-600 transition hover:bg-red-400/10 hover:text-red-700"><Trash2 size={15} /></button></div>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-2"><FocusBadge focus={person.focusArea} /><Badge className="border-line bg-slate-50 text-slate-600">{person.relationshipStatus}</Badge>{person.tags.map((tag) => <Badge key={tag} className="border-line bg-transparent text-slate-500">#{tag}</Badge>)}<div className="ml-auto"><ContextMeter value={person.contextLevel} /></div></div>
        </div>
        <div className="overflow-x-auto border-t border-line px-3 sm:px-5">
          <div className="flex min-w-max">
            {tabs.map((item) => <button key={item.id} onClick={() => setTab(item.id)} className={`relative flex items-center gap-2 px-3 py-4 text-xs font-medium transition sm:px-4 ${tab === item.id ? "text-slate-950" : "text-slate-600 hover:text-slate-700"}`}><item.icon size={14} />{item.label}{tab === item.id && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-lime" />}</button>)}
          </div>
        </div>
      </div>

      <div className="mt-6">
        {tab === "overview" && (
          <div className="grid gap-6 xl:grid-cols-[1fr_.7fr]">
            <section className="card p-5 sm:p-6"><SectionHeading eyebrow="Relationship snapshot" title="Overview" /><p className="text-sm leading-7 text-slate-600">{person.context.summary || person.notes || "No summary added yet."}</p>{person.notes && person.context.summary && <div className="mt-5 rounded-xl bg-slate-50 p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">Your original notes</p><p className="mt-2 text-sm leading-6 text-slate-600">{person.notes}</p></div>}<div className="mt-6 grid gap-5 border-t border-line pt-5 sm:grid-cols-2"><Info label="How we met" value={person.howWeMet} /><Info label="Introduced by" value={person.introducedBy || "Direct connection"} /><Info label="Last interaction" value={formatDate(person.lastInteractionDate)} /><Info label="Next follow-up" value={formatDate(person.nextFollowUpDate)} /></div></section>
            <div className="space-y-6">
              <section className="card p-5 sm:p-6">
                <SectionHeading eyebrow="Pictures" title="Profile photos" action={<button onClick={() => setEditOpen(true)} className="button-secondary"><ImagePlus size={15} /> Add</button>} />
                {(person.galleryUrls || []).length ? (
                  <div className="grid grid-cols-2 gap-3">
                    {(person.galleryUrls || []).map((url, index) => (
                      <button key={`${url}-${index}`} onClick={() => setEditOpen(true)} className="group aspect-square overflow-hidden rounded-xl border border-line bg-slate-100 text-left">
                        <img src={url} alt={`${person.name} photo ${index + 1}`} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <button onClick={() => setEditOpen(true)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-slate-50 px-4 py-8 text-sm font-medium text-slate-500 transition hover:border-slate-300 hover:text-slate-700">
                    <ImagePlus size={16} /> Add photos for this profile
                  </button>
                )}
              </section>
              <section className="card p-5 sm:p-6"><SectionHeading eyebrow="At a glance" title="Current focus" /><Info label="Present" value={person.context.present} /><div className="my-5 border-t border-line" /><Info label="Future" value={person.context.future} /><div className="my-5 border-t border-line" /><Info label="Opportunity" value={person.context.opportunities} /></section>
            </div>
          </div>
        )}
        {tab === "context" && (
          <div className="grid gap-4 md:grid-cols-2">
            {[
              ["Past", person.context.past], ["Present", person.context.present], ["Future", person.context.future], ["Personality", person.context.personality],
              ["Beliefs", person.context.beliefs], ["Drives", person.context.drives], ["Opportunities", person.context.opportunities], ["Risks / things to remember", person.context.risks],
            ].map(([label, value], index) => <div key={label} className={`card p-5 sm:p-6 ${index === 6 ? "border-lime/15" : index === 7 ? "border-orange-400/15" : ""}`}><p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">{label}</p><p className="text-sm leading-7 text-slate-600">{value || "No context recorded yet."}</p></div>)}
          </div>
        )}
        {tab === "interactions" && <section><SectionHeading eyebrow="Conversation memory" title={`${personInteractions.length} interactions`} action={<button onClick={() => setInteractionOpen(true)} className="button-primary"><Plus size={15} /> Add interaction</button>} /><InteractionTimeline interactions={personInteractions} /></section>}
        {tab === "actions" && <section><SectionHeading eyebrow="Keep momentum" title="Follow-up actions" action={<button onClick={() => { setEditingAction(undefined); setActionOpen(true); }} className="button-primary"><Plus size={15} /> Add action</button>} /><FollowUpList followUps={personFollowUps} onEdit={(item) => { setEditingAction(item); setActionOpen(true); }} /></section>}
        {tab === "documents" && (
          <section>
            <SectionHeading eyebrow="Commercial memory" title="Invoices & proposals" action={<button onClick={() => { setEditingDocument(undefined); setDocumentOpen(true); }} className="button-primary"><Plus size={15} /> Add document</button>} />
            {personDocuments.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{personDocuments.map((document) => <CommercialDocumentCard key={document.id} document={document} people={people} onEdit={() => { setEditingDocument(document); setDocumentOpen(true); }} />)}</div> : <EmptyState icon={<ReceiptText size={18} />} title="No documents sent" body="Add invoices or proposals tied to this person to track the commercial relationship." />}
          </section>
        )}
        {tab === "connections" && (
          <div className="grid gap-6 xl:grid-cols-2">
            <section className="card p-5 sm:p-6"><SectionHeading eyebrow="Origin" title="How you are connected" /><Info label="How we met" value={person.howWeMet} /><div className="my-5 border-t border-line" /><Info label="Introduced by" value={person.introducedBy || "Direct connection"} /></section>
            <section className="card p-5 sm:p-6"><SectionHeading eyebrow="Relationship graph" title="Connected people" />{connected.length ? <div className="space-y-2">{connected.map((item) => <Link href={`/people/${item.id}`} key={item.id} className="flex items-center gap-3 rounded-xl p-3 hover:bg-slate-100"><Avatar initials={item.initials} color={item.avatarColor} photoUrl={item.avatarUrl} /><div><p className="text-sm font-medium text-slate-950">{item.name}</p><p className="text-xs text-slate-600">{item.role} · {item.community}</p></div></Link>)}</div> : <p className="text-sm text-slate-500">No connected people recorded yet.</p>}</section>
            <section className="card p-5 sm:p-6 xl:col-span-2"><SectionHeading eyebrow="Shared spaces" title="Communities & events" /><div className="flex flex-wrap gap-3"><Badge className="border-violet-400/20 bg-violet-400/10 px-3 py-2 text-violet-700">{person.community}</Badge>{sharedEvents.map((event) => <Link href={`/events/${event.id}`} key={event.id}><Badge className="border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-cyan-700">{event.name}</Badge></Link>)}</div></section>
          </div>
        )}
        {tab === "ai" && <AISummaryBox person={person} interactions={personInteractions} followUps={personFollowUps} />}
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title={`Edit ${person.name}`} wide><PersonForm person={person} onDone={() => setEditOpen(false)} /></Modal>
      <Modal open={interactionOpen} onClose={() => setInteractionOpen(false)} title="Add interaction" description={`Log a conversation with ${person.name}.`}><InteractionForm personId={person.id} onDone={() => setInteractionOpen(false)} /></Modal>
      <Modal open={actionOpen} onClose={() => setActionOpen(false)} title={editingAction ? "Edit follow-up" : "Add follow-up action"}><FollowUpForm personId={person.id} followUp={editingAction} onDone={() => setActionOpen(false)} /></Modal>
      <Modal open={documentOpen} onClose={() => setDocumentOpen(false)} title={editingDocument ? `Edit ${editingDocument.title}` : "Add invoice or proposal"} wide><CommercialDocumentForm document={editingDocument ? editingDocument : undefined} defaultPersonId={person.id} onDone={() => setDocumentOpen(false)} /></Modal>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-600">{label}</p><p className="mt-2 text-sm leading-6 text-slate-600">{value || "Not recorded"}</p></div>;
}
