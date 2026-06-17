"use client";

import { Plus, UserSearch } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNetwork } from "@/components/app-provider";
import { FilterBar, Filters, emptyFilters } from "@/components/filter-bar";
import { PersonCard } from "@/components/person-card";
import { EmptyState, Modal } from "@/components/ui";
import { PersonForm } from "@/components/person-form";
import { isDue } from "@/utils";

export default function PeoplePage() {
  const { people, events } = useNetwork();
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [addOpen, setAddOpen] = useState(false);
  const communities = Array.from(new Set(people.map((person) => person.community).filter(Boolean))).sort();
  const tags = Array.from(new Set(people.flatMap((person) => person.tags))).sort();

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("followup") === "true") {
      setFilters((current) => ({ ...current, needsFollowUp: true }));
    }
  }, []);

  const filtered = useMemo(() => people.filter((person) => {
    const haystack = `${person.name} ${person.role} ${person.business} ${person.location} ${person.community} ${person.notes} ${person.tags.join(" ")}`.toLowerCase();
    return (!filters.search || haystack.includes(filters.search.toLowerCase()))
      && (!filters.focus || person.focusArea === filters.focus)
      && (!filters.context || person.contextLevel === Number(filters.context))
      && (!filters.community || person.community === filters.community)
      && (!filters.relationship || person.relationshipStatus === filters.relationship)
      && (!filters.event || person.eventIds.includes(filters.event))
      && (!filters.tag || person.tags.includes(filters.tag))
      && (!filters.needsFollowUp || person.relationshipStatus === "Needs follow-up" || isDue(person.nextFollowUpDate));
  }), [people, filters]);

  return (
    <>
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-lime">People database</p><h1 className="text-3xl font-semibold tracking-[-0.03em] text-slate-950">Every relationship, in context.</h1><p className="mt-2 text-sm text-slate-500">{filtered.length} of {people.length} people</p></div>
        <button onClick={() => setAddOpen(true)} className="button-primary"><Plus size={16} /> Add person</button>
      </div>
      <FilterBar filters={filters} setFilters={setFilters} communities={communities} events={events} tags={tags} />
      <div className="h-5" />
      {filtered.length ? <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 2xl:grid-cols-4">{filtered.map((person) => <PersonCard key={person.id} person={person} />)}</div> : <EmptyState icon={<UserSearch size={19} />} title="No people yet" body="Add a real person and upload their profile picture to begin building your visual network." action={<button onClick={() => setAddOpen(true)} className="button-primary"><Plus size={15} /> Add first person</button>} />}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add a person" description="Capture the relationship while the context is fresh." wide><PersonForm onDone={() => setAddOpen(false)} /></Modal>
    </>
  );
}
