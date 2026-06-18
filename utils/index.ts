export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function formatDate(date?: string, options?: Intl.DateTimeFormatOptions) {
  if (!date) return "Not set";
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...options,
  }).format(new Date(`${date}T12:00:00`));
}

export function isDue(date?: string) {
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${date}T00:00:00`) <= today;
}

export const focusStyles: Record<string, string> = {
  Attract: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
  Convert: "bg-orange-50 text-orange-700 border-orange-200",
  Deliver: "bg-cyan-50 text-cyan-700 border-cyan-200",
  Operations: "bg-slate-100 text-slate-700 border-slate-200",
  Partnerships: "bg-violet-50 text-violet-700 border-violet-200",
  Investor: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Friend: "bg-rose-50 text-rose-700 border-rose-200",
  Other: "bg-amber-50 text-amber-700 border-amber-200",
};

export const emptyContext = {
  summary: "",
  past: "",
  present: "",
  future: "",
  personality: "",
  beliefs: "",
  drives: "",
  opportunities: "",
  risks: "",
};
