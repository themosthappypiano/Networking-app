import { Calendar, Mail, MessageCircle, MessagesSquare, Phone, Users } from "lucide-react";
import { Interaction } from "@/types";
import { formatDate } from "@/utils";
import { EmptyState } from "@/components/ui";

const icons = { "Event meeting": Users, Call: Phone, DM: MessagesSquare, WhatsApp: MessageCircle, Email: Mail, "In-person": Users };

export function InteractionTimeline({ interactions }: { interactions: Interaction[] }) {
  if (!interactions.length) return <EmptyState icon={<MessagesSquare size={18} />} title="No interactions yet" body="Add your first conversation to start building relationship context." />;
  return (
    <div className="relative space-y-0 before:absolute before:bottom-5 before:left-[19px] before:top-5 before:w-px before:bg-line">
      {interactions.sort((a, b) => b.date.localeCompare(a.date)).map((interaction) => {
        const Icon = icons[interaction.type];
        return (
          <div key={interaction.id} className="relative flex gap-4 pb-7 last:pb-0">
            <div className="z-10 grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line bg-white text-lime"><Icon size={16} /></div>
            <div className="card flex-1 p-5">
              <div className="flex flex-col justify-between gap-2 sm:flex-row">
                <div><p className="font-medium text-slate-950">{interaction.summary}</p><p className="mt-1 text-xs text-slate-500">{interaction.type}</p></div>
                <p className="flex shrink-0 items-center gap-1.5 text-xs text-slate-500"><Calendar size={12} />{formatDate(interaction.date)}</p>
              </div>
              <div className="mt-5 grid gap-4 border-t border-line/60 pt-4 sm:grid-cols-2">
                <Detail label="Key points" value={interaction.keyPoints} />
                <Detail label="Decisions" value={interaction.decisions} />
                <Detail label="Actions agreed" value={interaction.actionsAgreed} />
                <Detail label="Remember" value={interaction.personalDetails} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">{label}</p><p className="mt-1.5 text-sm leading-6 text-slate-600">{value || "—"}</p></div>;
}
