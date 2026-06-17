"use client";

import { Download, RotateCcw, Upload } from "lucide-react";
import { ChangeEvent, useRef } from "react";
import { useNetwork } from "@/components/app-provider";
import { NetworkData, Person } from "@/types";
import { emptyContext } from "@/utils";

const colors = [
  "from-fuchsia-500 to-violet-600",
  "from-cyan-500 to-blue-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-red-600",
  "from-violet-500 to-indigo-600",
];

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }

  row.push(value);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}

function clean(value?: string) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function googleContactsCsvToData(text: string): NetworkData {
  const [header, ...rows] = parseCsv(text);
  if (!header?.length) throw new Error("Missing CSV header.");
  const columnIndex = new Map(header.map((label, index) => [label, index]));
  const read = (row: string[], label: string) => clean(row[columnIndex.get(label) ?? -1]);
  const today = new Date().toISOString().slice(0, 10);

  const people: Person[] = rows.map((row, index) => {
    const firstName = read(row, "First Name");
    const middleName = read(row, "Middle Name");
    const lastName = read(row, "Last Name");
    const fileAs = read(row, "File As");
    const name = clean([firstName, middleName, lastName].filter(Boolean).join(" ")) || fileAs;
    const email = read(row, "E-mail 1 - Value");
    const phone = read(row, "Phone 1 - Value");
    const organization = read(row, "Organization Name");
    const title = read(row, "Organization Title");
    const department = read(row, "Organization Department");
    const labels = read(row, "Labels").replace(/\*/g, "").split(",").map(clean).filter(Boolean);
    const originalNotes = read(row, "Notes");
    const contactNotes = [
      email && `Email: ${email}`,
      phone && `Phone: ${phone}`,
      originalNotes,
    ].filter(Boolean).join("\n");

    return {
      id: crypto.randomUUID(),
      name: name || `Imported contact ${index + 1}`,
      initials: initials(name),
      avatarColor: colors[index % colors.length],
      avatarUrl: "",
      bannerUrl: "",
      galleryUrls: [],
      linkedinUrl: "",
      community: labels[0] || "Google Contacts",
      role: title,
      business: organization,
      location: "",
      contextLevel: 1 as const,
      focusArea: "Other" as const,
      relationshipStatus: "New contact" as const,
      lastInteractionDate: today,
      nextFollowUpDate: "",
      tags: [department, ...labels].filter(Boolean),
      notes: contactNotes,
      howWeMet: "Imported from Google Contacts.",
      introducedBy: "",
      connectedPeopleIds: [],
      eventIds: [],
      context: {
        ...emptyContext,
        summary: [name, title && `is ${title}`, organization && `at ${organization}`].filter(Boolean).join(" "),
        present: [title, organization].filter(Boolean).join(" at "),
      },
    };
  }).filter((person) => person.name || person.notes || person.business);

  if (!people.length) throw new Error("No contacts found.");
  return { people, interactions: [], followUps: [], events: [] };
}

export function DataControls({ compact = false }: { compact?: boolean }) {
  const { people, interactions, followUps, events, importData, clearData } = useNetwork();
  const inputRef = useRef<HTMLInputElement>(null);

  function exportData() {
    const data = JSON.stringify({ people, interactions, followUps, events }, null, 2);
    const url = URL.createObjectURL(new Blob([data], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `network-os-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result);
        if (file.name.toLowerCase().endsWith(".csv")) {
          importData(googleContactsCsvToData(text));
        } else {
          const parsed = JSON.parse(text) as NetworkData;
          if (!Array.isArray(parsed.people) || !Array.isArray(parsed.events)) throw new Error();
          importData(parsed);
        }
      } catch (error) {
        alert(error instanceof Error ? error.message : "That file is not a valid Network OS backup or Google Contacts CSV.");
      }
      event.target.value = "";
    };
    reader.readAsText(file);
  }

  if (compact) {
    return (
      <div className="grid grid-cols-3 gap-1">
        <button onClick={exportData} title="Export JSON" className="grid h-9 place-items-center rounded-lg text-slate-500 transition hover:bg-white/5 hover:text-slate-950"><Download size={15} /></button>
        <button onClick={() => inputRef.current?.click()} title="Import JSON or CSV" className="grid h-9 place-items-center rounded-lg text-slate-500 transition hover:bg-white/5 hover:text-slate-950"><Upload size={15} /></button>
        <button onClick={() => confirm("Permanently clear all Network OS data from your Supabase account?") && clearData()} title="Clear all data" className="grid h-9 place-items-center rounded-lg text-slate-500 transition hover:bg-red-400/10 hover:text-red-700"><RotateCcw size={15} /></button>
        <input ref={inputRef} type="file" accept=".json,.csv,application/json,text/csv" onChange={handleImport} className="hidden" />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button onClick={exportData} className="button-secondary"><Download size={15} /> Export JSON</button>
      <button onClick={() => inputRef.current?.click()} className="button-secondary"><Upload size={15} /> Import JSON / CSV</button>
      <input ref={inputRef} type="file" accept=".json,.csv,application/json,text/csv" onChange={handleImport} className="hidden" />
    </div>
  );
}
