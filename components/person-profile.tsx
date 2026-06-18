"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bot, CalendarClock, Edit3, ImagePlus, Link2, MapPin, MessageSquareText, Plus, ReceiptText, Search, Trash2, UserRound } from "lucide-react";
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
  const [graphSearch, setGraphSearch] = useState("");

  if (!person) return <EmptyState icon={<UserRound size={20} />} title="Person not found" body="This contact may have been removed or the link is invalid." action={<Link href="/people" className="button-secondary">Back to people</Link>} />;
  const personInteractions = interactions.filter((item) => item.personId === person.id);
  const personFollowUps = followUps.filter((item) => item.personId === person.id);
  const personDocuments = documents.filter((item) => item.personIds.includes(person.id));
  const connected = people.filter((item) => person.connectedPeopleIds.includes(item.id));
  const incoming = people.filter((item) => item.connectedPeopleIds.includes(person.id) && !person.connectedPeopleIds.includes(item.id));
  const visibleGraphPeople = [...connected, ...incoming].slice(0, 10);
  const graphQuery = graphSearch.trim().toLowerCase();
  const graphMatches = people.filter((item) => {
    if (item.id === person.id) return false;
    if (!graphQuery) return person.connectedPeopleIds.includes(item.id) || item.connectedPeopleIds.includes(person.id);
    return `${item.name} ${item.role} ${item.business} ${item.community} ${item.tags.join(" ")}`.toLowerCase().includes(graphQuery);
  }).slice(0, 8);
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
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                onContextMenu={(event) => {
                  event.preventDefault();
                  setEditOpen(true);
                }}
                className="w-fit rounded-full border-4 border-white bg-white shadow-md"
                aria-label="Edit profile photo"
              >
                <Avatar initials={person.initials} color={person.avatarColor} photoUrl={person.avatarUrl} size="2xl" />
              </button>
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
                      <button
                        key={`${url}-${index}`}
                        onClick={() => setEditOpen(true)}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          setEditOpen(true);
                        }}
                        className="group aspect-square overflow-hidden rounded-xl border border-line bg-slate-100 text-left"
                        aria-label={`Edit ${person.name} photo ${index + 1}`}
                      >
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
          <div className="space-y-6">
            <section className="grid overflow-hidden rounded-2xl border border-line bg-[#101510] shadow-glow xl:grid-cols-[1.15fr_.85fr]">
              <div className="relative min-h-[360px] border-b border-white/10 bg-[radial-gradient(circle_at_center,rgba(132,204,22,0.16),transparent_52%)] xl:border-b-0 xl:border-r">
                <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.06)_1px,transparent_1px)] [background-size:28px_28px]" />
                {visibleGraphPeople.map((item, index) => {
                  const count = Math.max(visibleGraphPeople.length, 1);
                  const angle = -90 + (index * 360) / count;
                  return (
                    <div
                      key={`line-${item.id}`}
                      className="absolute left-1/2 top-1/2 h-px origin-left bg-lime/35"
                      style={{ width: "31%", transform: `rotate(${angle}deg)` }}
                    />
                  );
                })}
                <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
                  <div className="rounded-full border border-lime/40 bg-[#f8fbf0] p-1 shadow-[0_0_32px_rgba(132,204,22,0.32)]">
                    <Avatar initials={person.initials} color={person.avatarColor} photoUrl={person.avatarUrl} size="xl" />
                  </div>
                  <p className="mt-3 max-w-36 truncate text-center text-xs font-semibold text-white">{person.name}</p>
                </div>
                {visibleGraphPeople.map((item, index) => {
                  const count = Math.max(visibleGraphPeople.length, 1);
                  const angle = (-90 + (index * 360) / count) * (Math.PI / 180);
                  const left = 50 + Math.cos(angle) * 34;
                  const top = 50 + Math.sin(angle) * 34;
                  const isIncoming = incoming.some((candidate) => candidate.id === item.id);
                  return (
                    <Link
                      key={item.id}
                      href={`/people/${item.id}`}
                      className="absolute z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center"
                      style={{ left: `${left}%`, top: `${top}%` }}
                    >
                      <span className="rounded-full border border-lime/30 bg-[#f8fbf0] p-1 shadow-[0_0_24px_rgba(132,204,22,0.22)] transition hover:border-lime/70">
                        <Avatar initials={item.initials} color={item.avatarColor} photoUrl={item.avatarUrl} size="lg" />
                      </span>
                      <span className="mt-2 block w-24 truncate text-[11px] font-medium text-white">{item.name}</span>
                      {isIncoming && <span className="mt-1 block text-[10px] text-lime">links to you</span>}
                    </Link>
                  );
                })}
                {!visibleGraphPeople.length && (
                  <div className="absolute inset-0 z-10 grid place-items-center p-8 text-center">
                    <div>
                      <Link2 size={30} className="mx-auto text-lime" />
                      <p className="mt-3 text-sm font-medium text-white">No graph links yet</p>
                      <p className="mt-1 text-xs leading-5 text-white/60">Edit this profile and connect people to build the graph.</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="bg-[#f8fbf0] p-5 sm:p-6">
                <SectionHeading eyebrow="Graph search" title="Find linked people" action={<button onClick={() => setEditOpen(true)} className="button-secondary"><Edit3 size={15} /> Edit links</button>} />
                <label className="relative block">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input className="input h-11 bg-white pl-10" value={graphSearch} onChange={(event) => setGraphSearch(event.target.value)} placeholder="Search this network..." />
                </label>
                <div className="mt-4 space-y-2">
                  {graphMatches.map((item) => {
                    const direct = person.connectedPeopleIds.includes(item.id);
                    const reverse = item.connectedPeopleIds.includes(person.id);
                    return (
                      <Link href={`/people/${item.id}`} key={item.id} className="flex items-center gap-3 rounded-xl border border-line bg-white p-3 transition hover:border-slate-300">
                        <Avatar initials={item.initials} color={item.avatarColor} photoUrl={item.avatarUrl} size="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-slate-950">{item.name}</span>
                          <span className="block truncate text-xs text-slate-500">{item.role || item.business || item.community || "Contact"}</span>
                        </span>
                        <Badge className={direct ? "border-lime/30 bg-lime/10 text-lime" : reverse ? "border-cyan-300 bg-cyan-50 text-cyan-700" : "border-line bg-slate-50 text-slate-500"}>{direct ? "linked" : reverse ? "incoming" : "match"}</Badge>
                      </Link>
                    );
                  })}
                  {!graphMatches.length && <p className="rounded-xl border border-dashed border-line bg-white p-4 text-sm text-slate-500">No people match that search.</p>}
                </div>
              </div>
            </section>
            <div className="grid gap-6 xl:grid-cols-2">
            <section className="card p-5 sm:p-6"><SectionHeading eyebrow="Origin" title="How you are connected" /><Info label="How we met" value={person.howWeMet} /><div className="my-5 border-t border-line" /><Info label="Introduced by" value={person.introducedBy || "Direct connection"} /></section>
            <section className="card p-5 sm:p-6"><SectionHeading eyebrow="Relationship graph" title="Connected people" />{connected.length ? <div className="space-y-2">{connected.map((item) => <Link href={`/people/${item.id}`} key={item.id} className="flex items-center gap-3 rounded-xl p-3 hover:bg-slate-100"><Avatar initials={item.initials} color={item.avatarColor} photoUrl={item.avatarUrl} /><div><p className="text-sm font-medium text-slate-950">{item.name}</p><p className="text-xs text-slate-600">{item.role} · {item.community}</p></div></Link>)}</div> : <p className="text-sm text-slate-500">No connected people recorded yet.</p>}</section>
            <section className="card p-5 sm:p-6 xl:col-span-2"><SectionHeading eyebrow="Shared spaces" title="Communities & events" /><div className="flex flex-wrap gap-3"><Badge className="border-violet-400/20 bg-violet-400/10 px-3 py-2 text-violet-700">{person.community}</Badge>{sharedEvents.map((event) => <Link href={`/events/${event.id}`} key={event.id}><Badge className="border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-cyan-700">{event.name}</Badge></Link>)}</div></section>
            </div>
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
