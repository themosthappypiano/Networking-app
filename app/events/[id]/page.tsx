"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CalendarDays, Camera, Edit3, MapPin, Users } from "lucide-react";
import { useState } from "react";
import { useNetwork } from "@/components/app-provider";
import { Avatar, EmptyState, Modal, SectionHeading } from "@/components/ui";
import { EventForm } from "@/components/event-form";
import { formatDate } from "@/utils";

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const { events, people } = useNetwork();
  const [editOpen, setEditOpen] = useState(false);
  const event = events.find((item) => item.id === params.id);
  if (!event) return <EmptyState icon={<CalendarDays size={19} />} title="Event not found" body="This event may have been removed or the link is invalid." action={<Link href="/events" className="button-secondary">Back to events</Link>} />;
  const attendees = people.filter((person) => event.peopleIds.includes(person.id));
  return (
    <>
      <Link href="/events" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-slate-950"><ArrowLeft size={15} /> Back to events</Link>
      <div className="card overflow-hidden">
        <div className="min-h-52 bg-[radial-gradient(circle_at_15%_30%,rgba(199,243,107,0.16),transparent_28%),radial-gradient(circle_at_80%_0%,rgba(139,92,246,0.22),transparent_40%)] p-6 sm:p-8">
          <div className="flex items-start justify-between"><div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-black/20 text-lime"><CalendarDays size={21} /></div><button onClick={() => setEditOpen(true)} className="button-secondary"><Edit3 size={15} /> Edit event</button></div>
          <p className="mt-12 text-xs font-semibold uppercase tracking-[0.16em] text-lime">{formatDate(event.date)}</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-4xl">{event.name}</h1><p className="mt-3 flex items-center gap-2 text-sm text-slate-600"><MapPin size={14} />{event.location}</p>
        </div>
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <section className="card p-5 sm:p-6"><SectionHeading eyebrow="Event brief" title="About this event" /><p className="text-sm leading-7 text-slate-600">{event.description || "No description recorded."}</p><div className="my-6 border-t border-line" /><p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-600">Notes</p><p className="text-sm leading-7 text-slate-600">{event.notes || "No notes recorded."}</p><div className="my-6 border-t border-line" /><p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-lime">Main outcomes</p><p className="text-sm leading-7 text-slate-700">{event.outcomes || "No outcomes recorded."}</p></section>
        <section className="card p-5 sm:p-6"><SectionHeading eyebrow="The room" title={`${attendees.length} people attended`} />{attendees.length ? <div className="space-y-2">{attendees.map((person) => <Link href={`/people/${person.id}`} key={person.id} className="flex items-center gap-3 rounded-xl p-3 transition hover:bg-slate-100"><Avatar initials={person.initials} color={person.avatarColor} photoUrl={person.avatarUrl} /><div className="min-w-0"><p className="truncate text-sm font-medium text-slate-950">{person.name}</p><p className="truncate text-xs text-slate-600">{person.role} · {person.business}</p></div></Link>)}</div> : <EmptyState icon={<Users size={18} />} title="No people linked" body="Edit the event to connect attendees." />}</section>
        <section className="card p-5 sm:p-6 xl:col-span-2"><SectionHeading eyebrow="Visual memory" title="Photos" /><div className="grid min-h-44 place-items-center rounded-2xl border border-dashed border-line bg-slate-50 text-center"><div><Camera size={24} className="mx-auto text-slate-700" /><p className="mt-3 text-sm text-slate-500">Photo attachments are a placeholder in this local-first MVP.</p></div></div></section>
      </div>
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title={`Edit ${event.name}`}><EventForm event={event} onDone={() => setEditOpen(false)} /></Modal>
    </>
  );
}
