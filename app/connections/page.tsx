"use client";

import Link from "next/link";
import { Edit3, Link2, RotateCcw, Search } from "lucide-react";
import { PointerEvent, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useNetwork } from "@/components/app-provider";
import { Avatar, EmptyState, Modal } from "@/components/ui";
import { PersonForm } from "@/components/person-form";
import { FOCUS_AREAS, FocusArea, Person } from "@/types";

const POSITION_KEY = "network-os-connection-positions-v1";
const ambientDots = Array.from({ length: 32 }, (_, index) => ({
  id: index,
  x: 6 + ((index * 29) % 88),
  y: 8 + ((index * 47) % 82),
  delay: `${(index % 8) * 0.35}s`,
}));

function defaultPosition(index: number, total: number) {
  const angle = (index * 137.508 - 90) * (Math.PI / 180);
  const radius = total <= 3 ? 25 : 16 + ((index * 11) % 30);
  return {
    x: clamp(50 + Math.cos(angle) * radius, 8, 92),
    y: clamp(50 + Math.sin(angle) * radius * 0.78, 10, 90),
  };
}

function loadPositions() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(POSITION_KEY) || "{}") as Record<string, { x: number; y: number }>;
  } catch {
    return {};
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default function ConnectionsPage() {
  const { people } = useNetwork();
  const router = useRouter();
  const graphRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; moved: boolean } | null>(null);
  const [query, setQuery] = useState("");
  const [focus, setFocus] = useState<FocusArea | "">("");
  const [editingPerson, setEditingPerson] = useState<Person>();
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>(() => loadPositions());
  const [draggingId, setDraggingId] = useState("");

  const connectedIds = useMemo(() => {
    const ids = new Set<string>();
    people.forEach((person) => {
      if (person.connectedPeopleIds.length) ids.add(person.id);
      person.connectedPeopleIds.forEach((connectedId) => ids.add(connectedId));
    });
    return ids;
  }, [people]);

  const visiblePeople = useMemo(() => {
    const search = query.trim().toLowerCase();
    return people.filter((person) => {
      if (!connectedIds.has(person.id)) return false;
      if (focus && person.focusArea !== focus) return false;
      if (!search) return true;
      return `${person.name} ${person.role} ${person.business} ${person.community} ${person.tags.join(" ")}`.toLowerCase().includes(search);
    });
  }, [connectedIds, focus, people, query]);

  const visibleIds = new Set(visiblePeople.map((person) => person.id));
  const resolvedPositions = new Map(visiblePeople.map((person, index) => [
    person.id,
    positions[person.id] || defaultPosition(index, visiblePeople.length),
  ]));
  const lines = visiblePeople.flatMap((person) => person.connectedPeopleIds.map((connectedId) => {
    if (!visibleIds.has(connectedId)) return null;
    const from = resolvedPositions.get(person.id);
    const to = resolvedPositions.get(connectedId);
    if (!from || !to) return null;
    return {
      id: `${person.id}-${connectedId}`,
      from,
      to,
    };
  }).filter(Boolean));

  function setNodePosition(id: string, point: { x: number; y: number }) {
    setPositions((current) => {
      const next = { ...current, [id]: point };
      localStorage.setItem(POSITION_KEY, JSON.stringify(next));
      return next;
    });
  }

  function moveNode(event: PointerEvent, id: string) {
    const rect = graphRef.current?.getBoundingClientRect();
    if (!rect || !dragRef.current || dragRef.current.id !== id) return;
    dragRef.current.moved = true;
    setNodePosition(id, {
      x: clamp(((event.clientX - rect.left) / rect.width) * 100, 5, 95),
      y: clamp(((event.clientY - rect.top) / rect.height) * 100, 8, 92),
    });
  }

  return (
    <>
      <div className="mb-7 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-lime">Relationship graph</p>
          <h1 className="text-3xl font-semibold tracking-[-0.03em] text-slate-950">Connections</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">Only people with at least one connection appear here. Drag nodes to arrange the graph.</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row xl:max-w-2xl">
          <label className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input className="input h-11 bg-white pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search connected people..." />
          </label>
          <select className="input h-11 bg-white sm:w-56" value={focus} onChange={(event) => setFocus(event.target.value as FocusArea | "")}>
            <option value="">All focus areas</option>
            {FOCUS_AREAS.map((area) => <option key={area}>{area}</option>)}
          </select>
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem(POSITION_KEY);
              setPositions({});
            }}
            className="button-secondary h-11 shrink-0"
          >
            <RotateCcw size={15} /> Reset layout
          </button>
        </div>
      </div>

      {connectedIds.size ? (
        <section className="grid overflow-hidden rounded-2xl border border-line bg-[#101510] shadow-glow xl:grid-cols-[1fr_360px]">
          <div ref={graphRef} className="relative min-h-[620px] touch-none overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_center,rgba(132,204,22,0.16),transparent_56%)] xl:border-b-0 xl:border-r">
            <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.06)_1px,transparent_1px)] [background-size:28px_28px]" />
            {ambientDots.map((dot) => (
              <span
                key={dot.id}
                className="connection-ambient-dot absolute h-1.5 w-1.5 rounded-full bg-lime/35"
                style={{ left: `${dot.x}%`, top: `${dot.y}%`, animationDelay: dot.delay }}
              />
            ))}
            <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id="connection-line-gradient" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="rgba(132,204,22,0.16)" />
                  <stop offset="50%" stopColor="rgba(132,204,22,0.58)" />
                  <stop offset="100%" stopColor="rgba(132,204,22,0.16)" />
                </linearGradient>
              </defs>
              {lines.map((line) => line && (
                <line
                  key={line.id}
                  className="connection-line"
                  x1={line.from.x}
                  y1={line.from.y}
                  x2={line.to.x}
                  y2={line.to.y}
                  stroke="url(#connection-line-gradient)"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>
            {visiblePeople.map((person) => {
              const point = resolvedPositions.get(person.id)!;
              return (
                <button
                  key={person.id}
                  type="button"
                  onPointerDown={(event) => {
                    dragRef.current = { id: person.id, moved: false };
                    setDraggingId(person.id);
                    event.currentTarget.setPointerCapture(event.pointerId);
                  }}
                  onPointerMove={(event) => moveNode(event, person.id)}
                  onPointerUp={(event) => {
                    event.currentTarget.releasePointerCapture(event.pointerId);
                    if (!dragRef.current?.moved) router.push(`/people/${person.id}`);
                    dragRef.current = null;
                    setDraggingId("");
                  }}
                  onPointerCancel={() => {
                    dragRef.current = null;
                    setDraggingId("");
                  }}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    setEditingPerson(person);
                  }}
                  className={`connection-node absolute z-10 flex -translate-x-1/2 -translate-y-1/2 cursor-grab flex-col items-center text-center active:cursor-grabbing ${draggingId === person.id ? "is-dragging" : ""}`}
                  style={{ left: `${point.x}%`, top: `${point.y}%` }}
                >
                  <span className="connection-node-float flex flex-col items-center">
                    <span className="connection-node-core rounded-full border border-lime/30 bg-[#f8fbf0] p-1 shadow-[0_0_24px_rgba(132,204,22,0.22)] transition hover:border-lime/70">
                      <Avatar initials={person.initials} color={person.avatarColor} photoUrl={person.avatarUrl} size="lg" />
                    </span>
                    <span className="mt-2 w-28 truncate text-xs font-semibold text-white">{person.name}</span>
                    <span className="mt-0.5 w-28 truncate text-[10px] text-white/55">{person.connectedPeopleIds.length} links</span>
                  </span>
                </button>
              );
            })}
            {!visiblePeople.length && (
              <div className="absolute inset-0 grid place-items-center p-8 text-center">
                <p className="rounded-xl border border-white/10 bg-white/5 p-5 text-sm text-white/70">No connected people match the current filters.</p>
              </div>
            )}
          </div>

          <aside className="bg-[#f8fbf0] p-5 sm:p-6">
            <div className="mb-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-lime">Edit graph</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-950">People in view</h2>
            </div>
            <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
              {visiblePeople.map((person) => (
                <div key={person.id} className="flex items-center gap-3 rounded-xl border border-line bg-white p-3">
                  <Avatar initials={person.initials} color={person.avatarColor} photoUrl={person.avatarUrl} size="sm" />
                  <Link href={`/people/${person.id}`} className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-950">{person.name}</span>
                    <span className="block truncate text-xs text-slate-500">{person.role || person.business || person.community || "Contact"}</span>
                  </Link>
                  <button type="button" onClick={() => setEditingPerson(person)} className="grid h-8 w-8 place-items-center rounded-lg border border-line text-slate-500 transition hover:border-lime/40 hover:text-lime" aria-label={`Edit ${person.name} connections`}>
                    <Edit3 size={13} />
                  </button>
                </div>
              ))}
              {!visiblePeople.length && <p className="rounded-xl border border-dashed border-line bg-white p-4 text-sm text-slate-500">No people match that search.</p>}
            </div>
          </aside>
        </section>
      ) : (
        <EmptyState icon={<Link2 size={19} />} title="No connections yet" body="Edit a person and connect them to someone else. Then both people will appear in this graph." />
      )}

      <Modal open={Boolean(editingPerson)} onClose={() => setEditingPerson(undefined)} title={editingPerson ? `Edit ${editingPerson.name}` : "Edit person"} wide>
        <PersonForm person={editingPerson} onDone={() => setEditingPerson(undefined)} />
      </Modal>
    </>
  );
}
