import Link from "next/link";
import { CalendarClock, MessageSquareText, UserRoundCheck, Users } from "lucide-react";

export function DashboardStats({ total, followUps, interactions, strong }: { total: number; followUps: number; interactions: number; strong: number }) {
  const stats = [
    { label: "Total people", value: total, note: "in your network", icon: Users, color: "text-lime bg-lime/10", href: "/people" },
    { label: "Need follow-up", value: followUps, note: "open loops", icon: CalendarClock, color: "text-orange-700 bg-orange-400/10", href: "/people?followup=true" },
    { label: "Recent interactions", value: interactions, note: "last 30 days", icon: MessageSquareText, color: "text-cyan-700 bg-cyan-400/10", href: "/people?recent=true" },
    { label: "Core relationships", value: strong, note: "high context", icon: UserRoundCheck, color: "text-violet-700 bg-violet-400/10", href: "/people?minContext=4" },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <Link key={stat.label} href={stat.href} className="card block p-5 transition hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-2xl">
          <div className="flex items-start justify-between">
            <div className={`grid h-10 w-10 place-items-center rounded-xl ${stat.color}`}><stat.icon size={18} /></div>
            <span className="text-[10px] uppercase tracking-[0.14em] text-slate-700">Live</span>
          </div>
          <p className="mt-6 text-3xl font-semibold tracking-tight text-slate-950">{stat.value}</p>
          <div className="mt-1 flex items-center justify-between"><p className="text-sm font-medium text-slate-700">{stat.label}</p><p className="text-xs text-slate-600">{stat.note}</p></div>
        </Link>
      ))}
    </div>
  );
}
