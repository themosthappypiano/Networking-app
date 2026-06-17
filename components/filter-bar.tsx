"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { FOCUS_AREAS, RELATIONSHIP_STATUSES } from "@/types";

export interface Filters {
  search: string;
  focus: string;
  context: string;
  community: string;
  relationship: string;
  event: string;
  tag: string;
  needsFollowUp: boolean;
}

export const emptyFilters: Filters = { search: "", focus: "", context: "", community: "", relationship: "", event: "", tag: "", needsFollowUp: false };

export function FilterBar({ filters, setFilters, communities, events, tags }: {
  filters: Filters;
  setFilters: (filters: Filters) => void;
  communities: string[];
  events: Array<{ id: string; name: string }>;
  tags: string[];
}) {
  const hasFilters = Object.entries(filters).some(([key, value]) => key === "search" ? false : Boolean(value));
  const update = (key: keyof Filters, value: string | boolean) => setFilters({ ...filters, [key]: value });
  return (
    <div className="card p-3">
      <div className="flex flex-col gap-2 xl:flex-row">
        <label className="relative min-w-64 flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" />
          <input className="input pl-10" value={filters.search} onChange={(e) => update("search", e.target.value)} placeholder="Search people, companies, notes, tags..." />
        </label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:flex">
          <Select value={filters.focus} onChange={(v) => update("focus", v)} label="Focus" options={[...FOCUS_AREAS]} />
          <Select value={filters.context} onChange={(v) => update("context", v)} label="Context" options={["1", "2", "3", "4", "5"]} />
          <Select value={filters.community} onChange={(v) => update("community", v)} label="Community" options={communities} />
          <Select value={filters.relationship} onChange={(v) => update("relationship", v)} label="Relationship" options={[...RELATIONSHIP_STATUSES]} />
          <Select value={filters.event} onChange={(v) => update("event", v)} label="Event" options={events.map((event) => event.id)} optionLabels={Object.fromEntries(events.map((event) => [event.id, event.name]))} />
          <Select value={filters.tag} onChange={(v) => update("tag", v)} label="Tag" options={tags} />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line/60 pt-3">
        <button onClick={() => update("needsFollowUp", !filters.needsFollowUp)} className={`inline-flex h-8 items-center gap-2 rounded-lg border px-3 text-xs transition ${filters.needsFollowUp ? "border-orange-400/30 bg-orange-400/10 text-orange-700" : "border-line text-slate-500 hover:text-slate-950"}`}><SlidersHorizontal size={13} /> Needs follow-up</button>
        {hasFilters && <button onClick={() => setFilters({ ...emptyFilters, search: filters.search })} className="inline-flex h-8 items-center gap-1.5 px-2 text-xs text-slate-500 hover:text-slate-950"><X size={13} /> Clear filters</button>}
      </div>
    </div>
  );
}

function Select({ value, onChange, label, options, optionLabels = {} }: { value: string; onChange: (value: string) => void; label: string; options: string[]; optionLabels?: Record<string, string> }) {
  return <select className="input min-w-32 text-xs" value={value} onChange={(e) => onChange(e.target.value)}><option value="">{label}</option>{options.map((option) => <option key={option} value={option}>{optionLabels[option] || option}</option>)}</select>;
}
