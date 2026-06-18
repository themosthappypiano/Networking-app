import Link from "next/link";
import { ArrowUpRight, Camera, Clock3 } from "lucide-react";
import { Person } from "@/types";
import { focusStyles } from "@/utils";

export function PersonCard({ person, needsFollowUp = false, onEdit }: { person: Person; needsFollowUp?: boolean; onEdit?: (person: Person) => void }) {
  return (
    <Link
      href={`/people/${person.id}`}
      onContextMenu={(event) => {
        if (!onEdit) return;
        event.preventDefault();
        onEdit(person);
      }}
      className="group block overflow-hidden rounded-xl border border-line bg-panel transition duration-300 hover:-translate-y-1 hover:border-slate-500 hover:shadow-2xl"
    >
      <div className={`relative aspect-square overflow-hidden bg-gradient-to-br ${person.avatarColor}`}>
        {person.avatarUrl ? (
          <img src={person.avatarUrl} alt={person.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
        ) : (
          <div className="grid h-full w-full place-items-center">
            <div className="text-center">
              <span className="text-5xl font-semibold text-white/90 sm:text-6xl">{person.initials}</span>
              <p className="mt-3 flex items-center gap-1.5 text-xs text-white/60"><Camera size={13} /> Add profile photo</p>
            </div>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/55 to-transparent opacity-0 transition group-hover:opacity-100" />
        <ArrowUpRight size={20} className="absolute right-4 top-4 text-white opacity-0 drop-shadow transition group-hover:opacity-100" />
      </div>
      <div className={`border-t px-4 py-3.5 ${focusStyles[person.focusArea]}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-slate-950">{person.name}</h3>
            <p className="mt-1 truncate text-xs text-slate-950/60">{person.role || person.business || person.community || "New contact"}</p>
          </div>
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-950/45">L{person.contextLevel}</span>
        </div>
        {(person.community || needsFollowUp) && <div className="mt-2.5 flex items-center justify-between gap-2 text-[11px] text-slate-950/45"><span className="truncate">{person.community}</span>{needsFollowUp && <span className="flex shrink-0 items-center gap-1 text-orange-700"><Clock3 size={11} /> Follow up</span>}</div>}
      </div>
    </Link>
  );
}
