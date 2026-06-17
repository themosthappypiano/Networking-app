import Link from "next/link";
import { ArrowUpRight, CalendarDays, MapPin, Users } from "lucide-react";
import { NetworkEvent, Person } from "@/types";
import { Avatar } from "@/components/ui";
import { formatDate } from "@/utils";

export function EventCard({ event, people }: { event: NetworkEvent; people: Person[] }) {
  const attendees = people.filter((person) => event.peopleIds.includes(person.id));
  return (
    <Link href={`/events/${event.id}`} className="card group block overflow-hidden transition hover:-translate-y-0.5 hover:border-slate-600/80">
      <div className="h-28 border-b border-line bg-[radial-gradient(circle_at_20%_20%,rgba(199,243,107,0.18),transparent_35%),radial-gradient(circle_at_80%_80%,rgba(139,92,246,0.18),transparent_38%)] p-5">
        <div className="flex justify-between"><div className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-black/20 text-lime"><CalendarDays size={18} /></div><ArrowUpRight size={18} className="text-slate-600 transition group-hover:text-lime" /></div>
      </div>
      <div className="p-5">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-lime">{formatDate(event.date)}</p>
        <h3 className="mt-2 text-lg font-semibold text-slate-950">{event.name}</h3>
        <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">{event.description}</p>
        <div className="mt-5 flex items-center gap-2 text-xs text-slate-500"><MapPin size={13} />{event.location}</div>
        <div className="mt-5 flex items-center justify-between border-t border-line/60 pt-4">
          <div className="flex -space-x-2">{attendees.slice(0, 4).map((person) => <div key={person.id} className="rounded-full ring-2 ring-panel"><Avatar initials={person.initials} color={person.avatarColor} photoUrl={person.avatarUrl} size="sm" /></div>)}</div>
          <span className="flex items-center gap-1.5 text-xs text-slate-500"><Users size={13} />{attendees.length} people</span>
        </div>
      </div>
    </Link>
  );
}
