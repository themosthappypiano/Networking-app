import { CalendarClock, MessageSquareText, UserRoundCheck, Users } from "lucide-react";

export function DashboardStats({ total, followUps, interactions, strong }: { total: number; followUps: number; interactions: number; strong: number }) {
  const stats = [
    { label: "Total people", value: total, note: "in your network", icon: Users, color: "text-lime bg-lime/10" },
    { label: "Need follow-up", value: followUps, note: "open loops", icon: CalendarClock, color: "text-orange-700 bg-orange-400/10" },
    { label: "Recent interactions", value: interactions, note: "last 30 days", icon: MessageSquareText, color: "text-cyan-700 bg-cyan-400/10" },
    { label: "Core relationships", value: strong, note: "high context", icon: UserRoundCheck, color: "text-violet-700 bg-violet-400/10" },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="card p-5">
          <div className="flex items-start justify-between">
            <div className={`grid h-10 w-10 place-items-center rounded-xl ${stat.color}`}><stat.icon size={18} /></div>
            <span className="text-[10px] uppercase tracking-[0.14em] text-slate-700">Live</span>
          </div>
          <p className="mt-6 text-3xl font-semibold tracking-tight text-slate-950">{stat.value}</p>
          <div className="mt-1 flex items-center justify-between"><p className="text-sm font-medium text-slate-700">{stat.label}</p><p className="text-xs text-slate-600">{stat.note}</p></div>
        </div>
      ))}
    </div>
  );
}
