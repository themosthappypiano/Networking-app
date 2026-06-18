"use client";

import { Check, Circle, Clock3, ListTodo, Trash2 } from "lucide-react";
import { FollowUp } from "@/types";
import { formatDate, isDue } from "@/utils";
import { EmptyState } from "@/components/ui";
import { useNetwork } from "@/components/app-provider";

export function FollowUpList({ followUps, onEdit }: { followUps: FollowUp[]; onEdit?: (followUp: FollowUp) => void }) {
  const { deleteFollowUp, saveFollowUp } = useNetwork();
  if (!followUps.length) return <EmptyState icon={<ListTodo size={18} />} title="No follow-up actions" body="Create a concrete next step to keep this relationship moving." />;
  return (
    <div className="space-y-3">
      {[...followUps].sort((a, b) => a.dueDate.localeCompare(b.dueDate)).map((item) => (
        <div
          key={item.id}
          className="card flex items-start gap-4 p-4 transition hover:border-slate-600/70"
          onContextMenu={(event) => {
            if (!onEdit) return;
            event.preventDefault();
            onEdit(item);
          }}
        >
          <button type="button" onClick={() => saveFollowUp({ ...item, status: item.status === "Done" ? "Todo" : "Done" })} className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border ${item.status === "Done" ? "border-lime/30 bg-lime/10 text-lime" : "border-line text-slate-600 hover:text-lime"}`} aria-label={item.status === "Done" ? "Reopen follow-up" : "Complete follow-up"}>
            {item.status === "Done" ? <Check size={15} /> : <Circle size={14} />}
          </button>
          <button className="min-w-0 flex-1 text-left" onClick={() => onEdit?.(item)}>
            <div className="flex flex-wrap items-center gap-2">
              <p className={`text-sm font-medium ${item.status === "Done" ? "text-slate-600 line-through" : "text-slate-950"}`}>{item.title}</p>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${item.priority === "High" ? "bg-red-400/10 text-red-700" : item.priority === "Medium" ? "bg-amber-400/10 text-amber-700" : "bg-slate-400/10 text-slate-600"}`}>{item.priority}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">{item.status}</span>
            </div>
            {item.notes && <p className="mt-1.5 text-xs text-slate-500">{item.notes}</p>}
          </button>
          <p className={`flex shrink-0 items-center gap-1.5 text-xs ${item.status !== "Done" && isDue(item.dueDate) ? "text-orange-700" : "text-slate-500"}`}><Clock3 size={12} />{formatDate(item.dueDate, { year: undefined })}</p>
          <button type="button" onClick={() => deleteFollowUp(item.id)} className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line text-slate-500 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700" aria-label="Delete follow-up">
            <Trash2 size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
