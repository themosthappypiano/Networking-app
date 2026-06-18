"use client";

import { Plus, UserSearch } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNetwork } from "@/components/app-provider";
import { DataControls } from "@/components/data-controls";
import { FilterBar, Filters, emptyFilters } from "@/components/filter-bar";
import { PersonCard } from "@/components/person-card";
import { EmptyState, Modal } from "@/components/ui";
import { PersonForm } from "@/components/person-form";
import { Person } from "@/types";

export default function PeoplePage() {
  const { people, events, followUps } = useNetwork();
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [recentOnly, setRecentOnly] = useState(false);
  const [minContext, setMinContext] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person>();
  const communities = Array.from(new Set(people.map((person) => person.community).filter(Boolean))).sort();
  const tags = Array.from(new Set(people.flatMap((person) => person.tags))).sort();
  const openFollowUpPersonIds = new Set(followUps.filter((item) => item.status !== "Done").map((item) => item.personId));

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setFilters((current) => ({
      ...current,
      focus: params.get("focus") || current.focus,
      context: params.get("context") || current.context,
      relationship: params.get("relationship") || current.relationship,
      needsFollowUp: params.get("followup") === "true" || current.needsFollowUp,
    }));
    setRecentOnly(params.get("recent") === "true");
    setMinContext(Number(params.get("minContext") || 0));
  }, []);

  const filtered = useMemo(() => people.filter((person) => {
    const haystack = `${person.name} ${person.role} ${person.business} ${person.location} ${person.community} ${person.notes} ${person.tags.join(" ")}`.toLowerCase();
    const recentCutoff = new Date(Date.now() - 30 * 864e5);
    return (!filters.search || haystack.includes(filters.search.toLowerCase()))
      && (!filters.focus || person.focusArea === filters.focus)
      && (!filters.context || person.contextLevel === Number(filters.context))
      && (!minContext || person.contextLevel >= minContext)
      && (!filters.community || person.community === filters.community)
      && (!filters.relationship || person.relationshipStatus === filters.relationship)
      && (!filters.event || person.eventIds.includes(filters.event))
      && (!filters.tag || person.tags.includes(filters.tag))
      && (!recentOnly || Boolean(person.lastInteractionDate) && new Date(`${person.lastInteractionDate}T12:00:00`) >= recentCutoff)
      && (!filters.needsFollowUp || openFollowUpPersonIds.has(person.id));
  }), [people, filters, minContext, recentOnly, openFollowUpPersonIds]);

  return (
    <>
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-lime">People database</p><h1 className="text-3xl font-semibold tracking-[-0.03em] text-slate-950">Every relationship, in context.</h1><p className="mt-2 text-sm text-slate-500">{filtered.length} of {people.length} people</p></div>
        <div className="flex flex-wrap gap-2">
          <DataControls />
          <button onClick={() => setAddOpen(true)} className="button-primary"><Plus size={16} /> Add person</button>
        </div>
      </div>
      {(recentOnly || minContext > 0) && (
        <div className="mb-3 flex flex-wrap gap-2">
          {recentOnly && <button onClick={() => setRecentOnly(false)} className="inline-flex h-8 items-center rounded-lg border border-cyan-200 bg-cyan-50 px-3 text-xs text-cyan-700">Recent interactions x</button>}
          {minContext > 0 && <button onClick={() => setMinContext(0)} className="inline-flex h-8 items-center rounded-lg border border-violet-200 bg-violet-50 px-3 text-xs text-violet-700">Context {minContext}+ x</button>}
        </div>
      )}
      <FilterBar filters={filters} setFilters={setFilters} communities={communities} events={events} tags={tags} />
      <div className="h-5" />
      {filtered.length ? <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 2xl:grid-cols-4">{filtered.map((person) => <PersonCard key={person.id} person={person} needsFollowUp={openFollowUpPersonIds.has(person.id)} onEdit={(item) => setEditingPerson(item)} />)}</div> : <EmptyState icon={<UserSearch size={19} />} title="No people yet" body="Import your Google Contacts CSV or add a person manually to begin building your network." action={<div className="flex flex-wrap justify-center gap-2"><DataControls /><button onClick={() => setAddOpen(true)} className="button-primary"><Plus size={15} /> Add first person</button></div>} />}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add a person" description="Capture the relationship while the context is fresh." wide><PersonForm onDone={() => setAddOpen(false)} /></Modal>
      <Modal open={Boolean(editingPerson)} onClose={() => setEditingPerson(undefined)} title={editingPerson ? `Edit ${editingPerson.name}` : "Edit person"} wide><PersonForm person={editingPerson} onDone={() => setEditingPerson(undefined)} /></Modal>
    </>
  );
}
