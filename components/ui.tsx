"use client";

import { ReactNode } from "react";
import { X } from "lucide-react";
import { FocusArea } from "@/types";
import { cn, focusStyles } from "@/utils";

export function Badge({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium", className)}>{children}</span>;
}

export function FocusBadge({ focus }: { focus: FocusArea }) {
  return <Badge className={focusStyles[focus]}>{focus}</Badge>;
}

export function Avatar({ initials, color, photoUrl, size = "md" }: { initials: string; color: string; photoUrl?: string; size?: "sm" | "md" | "lg" | "xl" | "2xl" }) {
  const sizes = { sm: "h-8 w-8 text-[10px]", md: "h-10 w-10 text-xs", lg: "h-14 w-14 text-sm", xl: "h-24 w-24 text-xl", "2xl": "h-36 w-36 text-3xl sm:h-44 sm:w-44 sm:text-4xl" };
  return (
    <div className={cn("grid shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br font-semibold text-white ring-1 ring-white/30", color, sizes[size])}>
      {photoUrl ? <img src={photoUrl} alt="" className="h-full w-full object-cover" /> : initials}
    </div>
  );
}

export function SectionHeading({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-lime">{eyebrow}</p>}
        <h2 className="text-lg font-semibold tracking-tight text-slate-950">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-slate-50 p-8 text-center">
      <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl border border-line bg-slate-100 text-slate-600">{icon}</div>
      <h3 className="font-medium text-slate-950">{title}</h3>
      <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, description, children, wide = false }: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/35 p-0 backdrop-blur-sm sm:items-center sm:p-5" onMouseDown={onClose}>
      <div className={cn("max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-line bg-white shadow-2xl sm:rounded-3xl", wide ? "max-w-4xl" : "max-w-xl")} onMouseDown={(event) => event.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-line bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
            {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
          </div>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-white/5 hover:text-slate-950" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 sm:p-6">{children}</div>
      </div>
    </div>
  );
}

export function ContextMeter({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((level) => (
          <span key={level} className={cn("h-1.5 w-3 rounded-full", level <= value ? "bg-lime" : "bg-slate-700")} />
        ))}
      </div>
      <span className="text-xs text-slate-500">{value}/5</span>
    </div>
  );
}
