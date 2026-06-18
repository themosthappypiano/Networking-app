"use client";

import Link from "next/link";
import { ArrowRight, CalendarClock, Plus, Search, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { useNetwork } from "@/components/app-provider";
import { DashboardStats } from "@/components/dashboard-stats";
import { Avatar, FocusBadge, Modal, SectionHeading } from "@/components/ui";
import { PersonForm } from "@/components/person-form";
import { formatDate, focusStyles, isDue } from "@/utils";
import { FOCUS_AREAS } from "@/types";

export default function DashboardPage() {
  const { people, interactions, followUps } = useNetwork();
  const [addOpen, setAddOpen] = useState(false);
  const [query, setQuery] = useState("");
  const recentInteractions = [...interactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const openFollowUps = followUps.filter((item) => item.status !== "Done");
  const upcoming = openFollowUps.map((item) => ({ ...item, href: `/people/${item.personId}` }))
    .sort((a, b) => (a.dueDate || "9999-12-31").localeCompare(b.dueDate || "9999-12-31"))
    .slice(0, 5);
  const important = [...people].sort((a, b) => b.contextLevel - a.contextLevel || b.lastInteractionDate.localeCompare(a.lastInteractionDate)).slice(0, 4);
  const matches = useMemo(() => query.trim() ? people.filter((person) => `${person.name} ${person.role} ${person.business} ${person.community} ${person.tags.join(" ")}`.toLowerCase().includes(query.toLowerCase())).slice(0, 6) : [], [people, query]);
  const recentCount = interactions.filter((item) => new Date(item.date) >= new Date(Date.now() - 30 * 864e5)).length;
  const dueCount = new Set(openFollowUps.map((item) => item.personId)).size;

  return (
    <>
      <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-lime"><Sparkles size={13} /> Relationship command centre</div>
          <h1 className="max-w-2xl text-3xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-4xl">Your network, with context.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">Know who matters, remember every conversation, and make the right next move.</p>
        </div>
        <button onClick={() => setAddOpen(true)} className="button-primary"><Plus size={16} /> Add person</button>
      </div>

      <div className="relative mb-6">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} className="input h-14 rounded-2xl bg-panel/70 pl-12 pr-4 text-base shadow-glow" placeholder="Search your entire network..." />
        {matches.length > 0 && (
          <div className="absolute inset-x-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-2xl border border-line bg-white p-2 shadow-2xl">
            {matches.map((person) => <Link onClick={() => setQuery("")} key={person.id} href={`/people/${person.id}`} className="flex items-center gap-3 rounded-xl p-3 hover:bg-slate-100"><Avatar initials={person.initials} color={person.avatarColor} photoUrl={person.avatarUrl} /><div><p className="text-sm font-medium text-slate-950">{person.name}</p><p className="text-xs text-slate-500">{person.role} · {person.community}</p></div><ArrowRight size={15} className="ml-auto text-slate-600" /></Link>)}
          </div>
        )}
      </div>

      <DashboardStats total={people.length} followUps={dueCount} interactions={recentCount} strong={people.filter((person) => person.contextLevel >= 4).length} />

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <section className="card p-5 sm:p-6">
          <SectionHeading eyebrow="Network pulse" title="Focus area distribution" action={<Link href="/people" className="text-xs text-slate-500 transition hover:text-lime">View people →</Link>} />
          <div className="grid gap-3 sm:grid-cols-2">
            {FOCUS_AREAS.map((focus) => {
              const count = people.filter((person) => person.focusArea === focus).length;
              const percentage = people.length ? Math.round((count / people.length) * 100) : 0;
              return (
                <Link key={focus} href={`/people?focus=${encodeURIComponent(focus)}`} className="rounded-xl border border-line/70 bg-slate-50 p-3.5 transition hover:border-slate-400 hover:bg-white">
                  <div className="flex items-center justify-between"><span className={`rounded-full border px-2 py-0.5 text-[11px] ${focusStyles[focus]}`}>{focus}</span><span className="text-sm font-semibold text-slate-950">{count}</span></div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-current text-lime" style={{ width: `${Math.max(percentage, count ? 8 : 0)}%` }} /></div>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="card p-5 sm:p-6">
          <SectionHeading eyebrow="Next up" title="Upcoming actions" action={<Link href="/people?followup=true" className="text-xs text-slate-500 transition hover:text-lime">All actions →</Link>} />
          <div className="space-y-1">
            {upcoming.map((item) => {
              const person = people.find((candidate) => candidate.id === item.personId);
              if (!person) return null;
              return <Link href={item.href} key={item.id} className="flex items-center gap-3 rounded-xl p-3 transition hover:bg-[#f2f7e8]"><div className={`grid h-9 w-9 place-items-center rounded-xl ${isDue(item.dueDate) ? "bg-orange-400/10 text-orange-700" : "bg-slate-100 text-slate-500"}`}><CalendarClock size={16} /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-950">{item.title}</p><p className="mt-0.5 truncate text-xs text-slate-600">{person.name} · {item.priority}</p></div><span className={`text-xs ${isDue(item.dueDate) ? "text-orange-700" : "text-slate-500"}`}>{formatDate(item.dueDate, { year: undefined })}</span></Link>;
            })}
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[.85fr_1.15fr]">
        <section className="card p-5 sm:p-6">
          <SectionHeading eyebrow="High signal" title="Important relationships" />
          <div className="space-y-2">
            {important.map((person) => <Link key={person.id} href={`/people/${person.id}`} className="flex items-center gap-3 rounded-xl border border-transparent p-3 transition hover:border-line hover:bg-slate-50"><Avatar initials={person.initials} color={person.avatarColor} photoUrl={person.avatarUrl} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-950">{person.name}</p><p className="truncate text-xs text-slate-600">{person.role} · {person.business}</p></div><FocusBadge focus={person.focusArea} /></Link>)}
          </div>
        </section>

        <section className="card p-5 sm:p-6">
          <SectionHeading eyebrow="Memory stream" title="Recent interactions" />
          <div className="space-y-1">
            {recentInteractions.map((interaction) => {
              const person = people.find((candidate) => candidate.id === interaction.personId);
              if (!person) return null;
              return <Link href={`/people/${person.id}`} key={interaction.id} className="flex items-center gap-3 rounded-xl p-3 transition hover:bg-slate-50"><Avatar initials={person.initials} color={person.avatarColor} photoUrl={person.avatarUrl} size="sm" /><div className="min-w-0 flex-1"><p className="truncate text-sm text-slate-700"><span className="font-medium text-slate-950">{person.name}</span> · {interaction.summary}</p><p className="mt-0.5 text-xs text-slate-600">{interaction.type}</p></div><span className="shrink-0 text-xs text-slate-600">{formatDate(interaction.date, { year: undefined })}</span></Link>;
            })}
          </div>
        </section>
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add a person" description="Capture the relationship while the context is fresh." wide><PersonForm onDone={() => setAddOpen(false)} /></Modal>
    </>
  );
}
