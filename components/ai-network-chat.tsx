"use client";

import { FormEvent, useMemo, useState } from "react";
import { Bot, Check, Loader2, Send, Sparkles } from "lucide-react";
import { useNetwork } from "@/components/app-provider";
import { supabase } from "@/lib/supabase";
import { Person } from "@/types";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type PersonUpdate = {
  personId: string;
  reason: string;
  changes: Partial<Person>;
};

const editableKeys: Array<keyof Person> = [
  "name",
  "linkedinUrl",
  "community",
  "role",
  "business",
  "location",
  "contextLevel",
  "focusArea",
  "relationshipStatus",
  "lastInteractionDate",
  "nextFollowUpDate",
  "tags",
  "notes",
  "howWeMet",
  "introducedBy",
  "context",
];

function compactPerson(person: Person) {
  return {
    id: person.id,
    name: person.name,
    community: person.community,
    role: person.role,
    business: person.business,
    location: person.location,
    contextLevel: person.contextLevel,
    focusArea: person.focusArea,
    relationshipStatus: person.relationshipStatus,
    lastInteractionDate: person.lastInteractionDate,
    nextFollowUpDate: person.nextFollowUpDate,
    tags: person.tags,
    notes: person.notes,
    howWeMet: person.howWeMet,
    introducedBy: person.introducedBy,
    context: person.context,
  };
}

function cleanChanges(changes: Partial<Person>) {
  return Object.fromEntries(
    Object.entries(changes).filter(([key]) => editableKeys.includes(key as keyof Person)),
  ) as Partial<Person>;
}

export function AiNetworkChat() {
  const { people, savePerson } = useNetwork();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Tell me what changed and I can suggest profile updates. Example: Mark Cesar as followed up and add that he wants an intro to investors." },
  ]);
  const [input, setInput] = useState("");
  const [pendingUpdates, setPendingUpdates] = useState<PersonUpdate[]>([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");

  const peopleById = useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    const prompt = input.trim();
    if (!prompt || loading) return;

    const nextMessages = [...messages, { role: "user" as const, content: prompt }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError("");
    setPendingUpdates([]);

    try {
      const client = supabase;
      if (!client) throw new Error("Supabase is not configured.");
      const { data: sessionData, error: sessionError } = await client.auth.getSession();
      if (sessionError) throw sessionError;
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("Your session expired. Please sign in again.");

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: nextMessages.slice(-8),
          people: people.map(compactPerson),
        }),
      });

      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "AI request failed.");

      setMessages((current) => [...current, { role: "assistant", content: body.reply || "I found profile updates to review." }]);
      setPendingUpdates(Array.isArray(body.updates) ? body.updates : []);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "AI request failed.");
    } finally {
      setLoading(false);
    }
  }

  async function applyUpdates() {
    setApplying(true);
    setError("");
    try {
      for (const update of pendingUpdates) {
        const person = peopleById.get(update.personId);
        if (!person) continue;
        const changes = cleanChanges(update.changes || {});
        await savePerson({
          ...person,
          ...changes,
          context: { ...person.context, ...(changes.context || {}) },
          tags: Array.isArray(changes.tags) ? changes.tags : person.tags,
          galleryUrls: person.galleryUrls || [],
          connectedPeopleIds: person.connectedPeopleIds || [],
          eventIds: person.eventIds || [],
        });
      }
      setMessages((current) => [...current, { role: "assistant", content: `Applied ${pendingUpdates.length} profile update${pendingUpdates.length === 1 ? "" : "s"}.` }]);
      setPendingUpdates([]);
    } catch (applyError) {
      setError(applyError instanceof Error ? applyError.message : "Could not apply updates.");
    } finally {
      setApplying(false);
    }
  }

  return (
    <section className="card p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-lime">AI assistant</p>
          <h2 className="text-lg font-semibold tracking-tight text-slate-950">Update people by typing</h2>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-lime/10 text-lime"><Bot size={18} /></div>
      </div>

      <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border border-line bg-slate-50 p-3">
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={`rounded-xl px-3 py-2 text-sm leading-6 ${message.role === "user" ? "ml-8 bg-lime text-white" : "mr-8 bg-white text-slate-700"}`}>
            {message.content}
          </div>
        ))}
        {loading && <div className="mr-8 flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm text-slate-500"><Loader2 size={14} className="animate-spin" /> Thinking...</div>}
      </div>

      {pendingUpdates.length > 0 && (
        <div className="mt-4 rounded-xl border border-lime/25 bg-lime/5 p-3">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-950"><Sparkles size={15} className="text-lime" /> Suggested changes</div>
          <div className="space-y-2">
            {pendingUpdates.map((update) => {
              const person = peopleById.get(update.personId);
              return (
                <div key={update.personId} className="rounded-lg bg-white p-3 text-xs leading-5 text-slate-600">
                  <p className="font-medium text-slate-950">{person?.name || "Unknown person"}</p>
                  <p>{update.reason}</p>
                  <p className="mt-1 text-slate-500">{Object.keys(cleanChanges(update.changes || {})).join(", ")}</p>
                </div>
              );
            })}
          </div>
          <button onClick={applyUpdates} disabled={applying} className="button-primary mt-3 h-9 px-3 text-xs">
            {applying ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Apply changes
          </button>
        </div>
      )}

      <form onSubmit={sendMessage} className="mt-4 flex gap-2">
        <input className="input" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Tell AI what to change..." />
        <button type="submit" disabled={loading || !input.trim()} className="button-primary shrink-0 px-3"><Send size={15} /></button>
      </form>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </section>
  );
}
