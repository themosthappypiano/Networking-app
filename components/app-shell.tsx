"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Cloud, LayoutDashboard, LogOut, Menu, Network, Search, Users, X } from "lucide-react";
import { ReactNode, useState } from "react";
import { cn } from "@/utils";
import { DataControls } from "@/components/data-controls";
import { useNetwork } from "@/components/app-provider";
import { AiNetworkChat } from "@/components/ai-network-chat";

const navigation = [
  { href: "/", label: "Command centre", icon: LayoutDashboard },
  { href: "/people", label: "People", icon: Users },
  { href: "/events", label: "Events", icon: CalendarDays },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { user, syncError, signOut } = useNetwork();

  const nav = (
    <>
      <Link href="/" onClick={() => setOpen(false)} className="flex h-20 items-center gap-3 px-5 transition hover:bg-slate-50">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-lime text-white shadow-[0_10px_28px_rgba(101,163,13,0.2)]"><Network size={20} strokeWidth={2.5} /></div>
        <div>
          <p className="font-semibold tracking-tight text-slate-950">Network OS</p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-600">Relationship intel</p>
        </div>
      </Link>
      <nav className="flex-1 space-y-1 px-3 py-5">
        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">Workspace</p>
        {navigation.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
              active ? "bg-lime/10 text-slate-950" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
            )}>
              <item.icon size={17} className={active ? "text-lime" : ""} />
              {item.label}
              {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-lime" />}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-line p-3">
        <DataControls compact />
        <div className="mt-3 rounded-xl border border-line/80 bg-slate-50 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-700"><Cloud size={13} className={syncError ? "text-red-600" : "text-lime"} /> {syncError ? "Sync needs attention" : "Supabase connected"}</div>
          <p className="truncate text-[11px] text-slate-500" title={syncError || user?.email}>{syncError || user?.email}</p>
          <button onClick={signOut} className="mt-3 inline-flex items-center gap-2 text-[11px] font-medium text-slate-500 hover:text-slate-950"><LogOut size={12} /> Sign out</button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line/80 bg-[#f4f8ee]/95 backdrop-blur-xl lg:flex">{nav}</aside>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)}>
          <aside className="flex h-full w-72 flex-col border-r border-line bg-[#f4f8ee]" onClick={(e) => e.stopPropagation()}>
            <button className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-lg text-slate-600" onClick={() => setOpen(false)}><X size={18} /></button>
            {nav}
          </aside>
        </div>
      )}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center border-b border-line/70 bg-[#f4f8ee]/90 px-4 backdrop-blur-xl sm:px-6 lg:hidden">
          <button onClick={() => setOpen(true)} className="grid h-10 w-10 place-items-center rounded-xl border border-line text-slate-700"><Menu size={19} /></button>
          <Link href="/" className="ml-3 font-semibold">Network OS</Link>
          <Link href="/people" className="ml-auto grid h-10 w-10 place-items-center rounded-xl text-slate-600"><Search size={18} /></Link>
        </header>
        <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">{children}</main>
      </div>
      <AiNetworkChat />
    </div>
  );
}
