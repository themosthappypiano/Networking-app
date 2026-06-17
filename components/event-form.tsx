"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useNetwork } from "@/components/app-provider";
import { NetworkEvent } from "@/types";

export function EventForm({ event, onDone }: { event?: NetworkEvent; onDone: () => void }) {
  const { people, saveEvent } = useNetwork();
  const router = useRouter();
  const [form, setForm] = useState({
    id: event?.id,
    name: event?.name || "",
    location: event?.location || "",
    date: event?.date || "",
    description: event?.description || "",
    peopleIds: event?.peopleIds || [],
    notes: event?.notes || "",
    outcomes: event?.outcomes || "",
  });

  function togglePerson(id: string) {
    setForm((current) => ({
      ...current,
      peopleIds: current.peopleIds.includes(id) ? current.peopleIds.filter((personId) => personId !== id) : [...current.peopleIds, id],
    }));
  }

  function submit(eventObject: FormEvent) {
    eventObject.preventDefault();
    const id = saveEvent(form);
    onDone();
    if (!event) router.push(`/events/${id}`);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label><span className="label">Event name</span><input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label><span className="label">Location</span><input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></label>
      </div>
      <label><span className="label">Date</span><input required type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
      <label><span className="label">Description</span><textarea className="textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
      <div>
        <span className="label">People who attended</span>
        <div className="grid max-h-44 gap-2 overflow-y-auto rounded-xl border border-line bg-slate-50 p-3 sm:grid-cols-2">
          {people.map((person) => (
            <label key={person.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm text-slate-700 hover:bg-slate-100">
              <input type="checkbox" checked={form.peopleIds.includes(person.id)} onChange={() => togglePerson(person.id)} className="accent-lime" />
              {person.name}
            </label>
          ))}
        </div>
      </div>
      <label><span className="label">Notes</span><textarea className="textarea" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
      <label><span className="label">Main outcomes</span><textarea className="textarea" value={form.outcomes} onChange={(e) => setForm({ ...form, outcomes: e.target.value })} /></label>
      <div className="flex justify-end gap-3 pt-3"><button type="button" onClick={onDone} className="button-secondary">Cancel</button><button className="button-primary">{event ? "Save changes" : "Add event"}</button></div>
    </form>
  );
}
