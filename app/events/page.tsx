"use client";

import { CalendarPlus, CalendarX2 } from "lucide-react";
import { useState } from "react";
import { useNetwork } from "@/components/app-provider";
import { EventCard } from "@/components/event-card";
import { EventForm } from "@/components/event-form";
import { EmptyState, Modal } from "@/components/ui";

export default function EventsPage() {
  const { events, people } = useNetwork();
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-lime">Shared moments</p><h1 className="text-3xl font-semibold tracking-[-0.03em] text-slate-950">Events</h1><p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">Capture where relationships started and the outcomes that came from being in the room.</p></div>
        <button onClick={() => setOpen(true)} className="button-primary"><CalendarPlus size={16} /> Add event</button>
      </div>
      {events.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{[...events].sort((a, b) => b.date.localeCompare(a.date)).map((event) => <EventCard key={event.id} event={event} people={people} />)}</div> : <EmptyState icon={<CalendarX2 size={19} />} title="No events yet" body="Add a conference, dinner, meetup, or online gathering to connect people to a shared moment." />}
      <Modal open={open} onClose={() => setOpen(false)} title="Add event" description="Record the room, the people, and what came from it."><EventForm onDone={() => setOpen(false)} /></Modal>
    </>
  );
}
