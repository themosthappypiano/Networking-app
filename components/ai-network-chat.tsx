"use client";

import { FormEvent, useMemo, useState } from "react";
import { Bot, Check, Loader2, MessageCircle, Send, Settings2, Sparkles, X } from "lucide-react";
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

type UserStrategy = {
  about: string;
  currentGoals: string;
  projects: string;
  offers: string;
  needs: string;
  idealCollaborators: string;
  preferences: string;
  avoid: string;
};

const strategyKey = "network-os-user-strategy-v1";
const emptyStrategy: UserStrategy = {
  about: "",
  currentGoals: "",
  projects: "",
  offers: "",
  needs: "",
  idealCollaborators: "",
  preferences: "",
  avoid: "",
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
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [strategySaved, setStrategySaved] = useState(false);
  const [strategy, setStrategy] = useState<UserStrategy>(() => {
    if (typeof window === "undefined") return emptyStrategy;
    try {
      return { ...emptyStrategy, ...JSON.parse(localStorage.getItem(strategyKey) || "{}") };
    } catch {
      return emptyStrategy;
    }
  });
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Tell me what changed and I can suggest profile updates. Example: Mark Cesar as followed up and add that he wants an intro to investors." },
  ]);
  const [input, setInput] = useState("");
  const [pendingUpdates, setPendingUpdates] = useState<PersonUpdate[]>([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");

  const peopleById = useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);
  const hasStrategy = Object.values(strategy).some((value) => value.trim());

  function updateStrategy<K extends keyof UserStrategy>(key: K, value: UserStrategy[K]) {
    setStrategy((current) => ({ ...current, [key]: value }));
    setStrategySaved(false);
  }

  function saveStrategy() {
    localStorage.setItem(strategyKey, JSON.stringify(strategy));
    setStrategySaved(true);
    setSettingsOpen(false);
  }

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
          userStrategy: strategy,
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
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {open && (
        <section className="w-[calc(100vw-2.5rem)] max-w-md overflow-hidden rounded-2xl border border-lime/25 bg-[#f8fbf0] shadow-2xl">
          <div className="flex items-center justify-between gap-3 border-b border-lime/15 bg-[#eff6df] px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-lime text-white shadow-[0_12px_30px_rgba(101,163,13,0.24)]"><Bot size={18} /></div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-lime">AI assistant</p>
                <h2 className="text-sm font-semibold tracking-tight text-slate-950">Update people by typing</h2>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setSettingsOpen((current) => !current)} className={`grid h-9 w-9 place-items-center rounded-full transition ${hasStrategy ? "text-lime hover:bg-white/70" : "text-slate-500 hover:bg-white/70 hover:text-slate-950"}`} aria-label="Edit your AI profile">
                <Settings2 size={18} />
              </button>
              <button onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-full text-slate-500 transition hover:bg-white/70 hover:text-slate-950" aria-label="Close AI assistant">
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="p-4">
            {settingsOpen && (
              <div className="mb-4 rounded-xl border border-lime/20 bg-[#fbfdf7] p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">About me for AI</p>
                    <p className="text-xs leading-5 text-slate-500">This stays in your browser and helps the AI judge collaborations.</p>
                  </div>
                  {strategySaved && <span className="text-xs text-lime">Saved</span>}
                </div>
                <div className="grid gap-2">
                  <StrategyField label="Who I am" value={strategy.about} onChange={(value) => updateStrategy("about", value)} placeholder="Your background, skills, role, values..." />
                  <StrategyField label="Current goals" value={strategy.currentGoals} onChange={(value) => updateStrategy("currentGoals", value)} placeholder="What you are trying to achieve now..." />
                  <StrategyField label="Projects" value={strategy.projects} onChange={(value) => updateStrategy("projects", value)} placeholder="Products, communities, businesses, events..." />
                  <StrategyField label="What I can offer" value={strategy.offers} onChange={(value) => updateStrategy("offers", value)} placeholder="Introductions, audience, skills, capital, advice..." />
                  <StrategyField label="What I need" value={strategy.needs} onChange={(value) => updateStrategy("needs", value)} placeholder="Partners, clients, mentors, suppliers, funding..." />
                  <StrategyField label="Ideal collaborators" value={strategy.idealCollaborators} onChange={(value) => updateStrategy("idealCollaborators", value)} placeholder="Who is valuable for you to work with..." />
                  <StrategyField label="Preferences" value={strategy.preferences} onChange={(value) => updateStrategy("preferences", value)} placeholder="Communication style, industries, locations, deal types..." />
                  <StrategyField label="Avoid" value={strategy.avoid} onChange={(value) => updateStrategy("avoid", value)} placeholder="People, opportunities, industries, or asks to avoid..." />
                </div>
                <button onClick={saveStrategy} className="button-primary mt-3 h-9 px-3 text-xs">Save about me</button>
              </div>
            )}

            {!hasStrategy && (
              <button onClick={() => setSettingsOpen(true)} className="mb-3 flex w-full items-center justify-between rounded-xl border border-lime/20 bg-lime/5 px-3 py-2 text-left text-xs text-slate-600 transition hover:bg-lime/10">
                <span>Add your goals so AI can reason about collaborations.</span>
                <Settings2 size={14} className="text-lime" />
              </button>
            )}

            <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border border-lime/15 bg-[#eef5e8] p-3">
              {messages.map((message, index) => (
                <div key={`${message.role}-${index}`} className={`rounded-xl px-3 py-2 text-sm leading-6 ${message.role === "user" ? "ml-8 bg-lime text-white" : "mr-8 bg-[#fbfdf7] text-slate-700"}`}>
                  {message.content}
                </div>
              ))}
              {loading && <div className="mr-8 flex items-center gap-2 rounded-xl bg-[#fbfdf7] px-3 py-2 text-sm text-slate-500"><Loader2 size={14} className="animate-spin" /> Thinking...</div>}
            </div>

            {pendingUpdates.length > 0 && (
              <div className="mt-4 rounded-xl border border-lime/25 bg-lime/5 p-3">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-950"><Sparkles size={15} className="text-lime" /> Suggested changes</div>
                <div className="space-y-2">
                  {pendingUpdates.map((update) => {
                    const person = peopleById.get(update.personId);
                    return (
                      <div key={update.personId} className="rounded-lg bg-[#fbfdf7] p-3 text-xs leading-5 text-slate-600">
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
              <button type="submit" disabled={loading || !input.trim()} className="button-primary shrink-0 px-3" aria-label="Send message"><Send size={15} /></button>
            </form>
            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          </div>
        </section>
      )}

      <button
        onClick={() => setOpen((current) => !current)}
        className="grid h-16 w-16 place-items-center rounded-full bg-lime text-white shadow-[0_18px_42px_rgba(101,163,13,0.38)] transition hover:scale-105 hover:bg-lime/90"
        aria-label={open ? "Close AI assistant" : "Open AI assistant"}
      >
        {open ? <X size={24} /> : <MessageCircle size={25} />}
      </button>
    </div>
  );
}

function StrategyField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label>
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <textarea className="textarea min-h-16 text-xs" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}
