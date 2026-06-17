import Link from "next/link";
import { Person } from "@/types";
import { Avatar, ContextMeter, FocusBadge } from "@/components/ui";
import { formatDate, isDue } from "@/utils";

export function PersonTable({ people }: { people: Person[] }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[950px] text-left">
        <thead><tr className="border-b border-line text-[10px] uppercase tracking-[0.14em] text-slate-600">
          <th className="px-5 py-4 font-medium">Person</th><th className="px-4 py-4 font-medium">Focus</th><th className="px-4 py-4 font-medium">Context</th><th className="px-4 py-4 font-medium">Relationship</th><th className="px-4 py-4 font-medium">Community</th><th className="px-4 py-4 font-medium">Last interaction</th><th className="px-5 py-4 font-medium">Next follow-up</th>
        </tr></thead>
        <tbody>
          {people.map((person) => (
            <tr key={person.id} className="border-b border-line/60 transition last:border-0 hover:bg-slate-50">
              <td className="px-5 py-4"><Link href={`/people/${person.id}`} className="flex items-center gap-3"><Avatar initials={person.initials} color={person.avatarColor} photoUrl={person.avatarUrl} /><span><span className="block text-sm font-medium text-slate-950">{person.name}</span><span className="block max-w-52 truncate text-xs text-slate-500">{person.role} · {person.business}</span></span></Link></td>
              <td className="px-4 py-4"><FocusBadge focus={person.focusArea} /></td>
              <td className="px-4 py-4"><ContextMeter value={person.contextLevel} /></td>
              <td className="px-4 py-4 text-sm text-slate-600">{person.relationshipStatus}</td>
              <td className="px-4 py-4 text-sm text-slate-500">{person.community}</td>
              <td className="px-4 py-4 text-sm text-slate-500">{formatDate(person.lastInteractionDate, { year: undefined })}</td>
              <td className={`px-5 py-4 text-sm ${isDue(person.nextFollowUpDate) ? "text-orange-700" : "text-slate-500"}`}>{formatDate(person.nextFollowUpDate, { year: undefined })}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
