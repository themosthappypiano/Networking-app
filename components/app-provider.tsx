"use client";

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { User } from "@supabase/supabase-js";
import { emptyData, removeLegacySampleData } from "@/data/initial-data";
import { AuthScreen } from "@/components/auth-screen";
import {
  commercialDocumentRow, eventRow, followUpRow, interactionRow, loadNetworkData, personRow,
  remapLocalData, replaceNetworkData, uploadDataImage,
} from "@/lib/network-repository";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { CommercialDocument, FollowUp, Interaction, NetworkData, NetworkEvent, Person, PersonInput } from "@/types";

const STORAGE_KEY = "network-os-data-v1";
const SAMPLE_CLEANUP_KEY = "network-os-sample-cleanup-v1";
const MIGRATION_KEY = "network-os-supabase-migration-v1";
const colors = [
  "from-fuchsia-500 to-violet-600",
  "from-cyan-500 to-blue-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-red-600",
  "from-violet-500 to-indigo-600",
];

interface AppContextValue extends NetworkData {
  hydrated: boolean;
  user: User | null;
  syncError: string;
  savePerson: (input: PersonInput) => Promise<string>;
  deletePerson: (id: string) => void;
  addInteraction: (input: Omit<Interaction, "id">) => void;
  saveFollowUp: (input: Omit<FollowUp, "id"> & { id?: string }) => void;
  deleteFollowUp: (id: string) => void;
  saveEvent: (input: Omit<NetworkEvent, "id"> & { id?: string }) => string;
  saveDocument: (input: Omit<CommercialDocument, "id"> & { id?: string }) => string;
  deleteDocument: (id: string) => void;
  importData: (data: NetworkData) => void;
  clearData: () => void;
  signOut: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function localData() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return emptyData;
    const parsed = JSON.parse(stored) as NetworkData;
    const migrated = { ...emptyData, ...parsed, documents: parsed.documents || [] };
    return !localStorage.getItem(SAMPLE_CLEANUP_KEY) ? removeLegacySampleData(migrated) : migrated;
  } catch {
    return emptyData;
  }
}

function hasData(data: NetworkData) {
  return data.people.length + data.interactions.length + data.followUps.length + data.events.length > 0;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<NetworkData>(emptyData);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [syncError, setSyncError] = useState("");

  function report(error: unknown) {
    console.error(error);
    setSyncError(error instanceof Error ? error.message : "Cloud sync failed.");
  }

  useEffect(() => {
    if (!supabase) {
      setAuthReady(true);
      return;
    }
    supabase.auth.getSession().then(({ data: sessionData }) => {
      setUser(sessionData.session?.user || null);
      setAuthReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      setAuthReady(true);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !supabase) {
      setHydrated(false);
      setData(emptyData);
      return;
    }

    let active = true;
    async function hydrate() {
      try {
        setSyncError("");
        const cloud = await loadNetworkData(supabase!);
        const browserData = localData();
        const migrationKey = `${MIGRATION_KEY}:${user!.id}`;
        if (!hasData(cloud) && hasData(browserData) && !localStorage.getItem(migrationKey)) {
          const migrated = remapLocalData(browserData);
          await replaceNetworkData(supabase!, user!.id, migrated);
          localStorage.setItem(migrationKey, "complete");
          if (active) setData(await loadNetworkData(supabase!));
        } else if (active) {
          setData(cloud);
        }
        localStorage.setItem(SAMPLE_CLEANUP_KEY, "complete");
      } catch (error) {
        if (active) report(error);
      } finally {
        if (active) setHydrated(true);
      }
    }
    hydrate();
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data, hydrated]);

  const value = useMemo<AppContextValue>(() => ({
    ...data,
    hydrated,
    user,
    syncError,
    savePerson: async (input) => {
      const id = input.id || crypto.randomUUID();
      const existing = data.people.find((person) => person.id === id);
      const person: Person = {
        ...input,
        id,
        initials: input.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
        avatarColor: existing?.avatarColor || colors[data.people.length % colors.length],
        galleryUrls: input.galleryUrls || existing?.galleryUrls || [],
        galleryPaths: input.galleryPaths || existing?.galleryPaths || [],
        connectedPeopleIds: input.connectedPeopleIds || existing?.connectedPeopleIds || [],
        eventIds: input.eventIds || existing?.eventIds || [],
      };
      if (!supabase || !user) throw new Error("Sign in before saving a profile.");

      setSyncError("");
      try {
        const avatarPath = person.avatarUrl?.startsWith("data:")
          ? await uploadDataImage(supabase, user.id, "avatars", person.avatarUrl)
          : !person.avatarUrl
            ? null
            : person.avatarUrl === existing?.avatarUrl
              ? existing.avatarPath || person.avatarUrl
              : person.avatarUrl;
        const bannerPath = person.bannerUrl?.startsWith("data:")
          ? await uploadDataImage(supabase, user.id, "banners", person.bannerUrl)
          : !person.bannerUrl
            ? null
            : person.bannerUrl === existing?.bannerUrl
              ? existing.bannerPath || person.bannerUrl
              : person.bannerUrl;
        const galleryPaths = await Promise.all((person.galleryUrls || []).map((url, index) => {
          if (url.startsWith("data:")) return uploadDataImage(supabase!, user.id, "avatars", url);
          if (url === existing?.galleryUrls?.[index]) return Promise.resolve(existing.galleryPaths?.[index] || url);
          return Promise.resolve(url);
        }));
        const { error } = await supabase.from("people").upsert(personRow(person, avatarPath, bannerPath, galleryPaths.filter(Boolean) as string[]));
        if (error) throw error;
        const { error: deleteConnectionsError } = await supabase.from("person_connections").delete().eq("person_id", id);
        if (deleteConnectionsError) throw deleteConnectionsError;
        if (person.connectedPeopleIds.length) {
          const { error: connectionError } = await supabase.from("person_connections").insert(
            person.connectedPeopleIds.map((connectedPersonId) => ({ person_id: id, connected_person_id: connectedPersonId })),
          );
          if (connectionError) throw connectionError;
        }
        setData(await loadNetworkData(supabase));
      } catch (error) {
        report(error);
        throw error;
      }
      return id;
    },
    deletePerson: (id) => {
      setData((current) => ({
        ...current,
        people: current.people.filter((person) => person.id !== id),
        interactions: current.interactions.filter((item) => item.personId !== id),
        followUps: current.followUps.filter((item) => item.personId !== id),
        events: current.events.map((event) => ({ ...event, peopleIds: event.peopleIds.filter((personId) => personId !== id) })),
      }));
      if (supabase) void supabase.from("people").delete().eq("id", id).then(({ error }) => { if (error) report(error); });
    },
    addInteraction: (input) => {
      const interaction = { ...input, id: crypto.randomUUID() };
      setData((current) => ({
        ...current,
        interactions: [interaction, ...current.interactions],
        people: current.people.map((person) => person.id === input.personId ? { ...person, lastInteractionDate: input.date } : person),
      }));
      if (supabase) void (async () => {
        const { error } = await supabase.from("interactions").insert(interactionRow(interaction));
        if (error) throw error;
        const { error: personError } = await supabase.from("people").update({ last_interaction_date: input.date }).eq("id", input.personId);
        if (personError) throw personError;
      })().catch(report);
    },
    saveFollowUp: (input) => {
      const followUp = { ...input, id: input.id || crypto.randomUUID() };
      setData((current) => {
        const exists = current.followUps.some((item) => item.id === followUp.id);
        return { ...current, followUps: exists ? current.followUps.map((item) => item.id === followUp.id ? followUp : item) : [followUp, ...current.followUps] };
      });
      if (supabase) void supabase.from("follow_ups").upsert(followUpRow(followUp)).then(({ error }) => { if (error) report(error); });
    },
    deleteFollowUp: (id) => {
      setData((current) => ({ ...current, followUps: current.followUps.filter((item) => item.id !== id) }));
      if (supabase) void supabase.from("follow_ups").delete().eq("id", id).then(({ error }) => { if (error) report(error); });
    },
    saveEvent: (input) => {
      const event = { ...input, id: input.id || crypto.randomUUID() };
      setData((current) => ({
        ...current,
        events: current.events.some((item) => item.id === event.id) ? current.events.map((item) => item.id === event.id ? event : item) : [event, ...current.events],
        people: current.people.map((person) => ({
          ...person,
          eventIds: input.peopleIds.includes(person.id) ? Array.from(new Set([...person.eventIds, event.id])) : person.eventIds.filter((eventId) => eventId !== event.id),
        })),
      }));
      void (async () => {
        if (!supabase) return;
        const { error } = await supabase.from("events").upsert(eventRow(event));
        if (error) throw error;
        await supabase.from("event_people").delete().eq("event_id", event.id);
        if (event.peopleIds.length) {
          const { error: linkError } = await supabase.from("event_people").insert(event.peopleIds.map((personId) => ({ event_id: event.id, person_id: personId })));
          if (linkError) throw linkError;
        }
      })().catch(report);
      return event.id;
    },
    saveDocument: (input) => {
      const document = { ...input, id: input.id || crypto.randomUUID() };
      setData((current) => ({
        ...current,
        documents: current.documents.some((item) => item.id === document.id)
          ? current.documents.map((item) => item.id === document.id ? document : item)
          : [document, ...current.documents],
      }));
      void (async () => {
        if (!supabase) return;
        const { error } = await supabase.from("commercial_documents").upsert(commercialDocumentRow(document));
        if (error) throw error;
        await supabase.from("commercial_document_people").delete().eq("document_id", document.id);
        if (document.personIds.length) {
          const { error: linkError } = await supabase.from("commercial_document_people").insert(
            document.personIds.map((personId) => ({ document_id: document.id, person_id: personId })),
          );
          if (linkError) throw linkError;
        }
      })().catch(report);
      return document.id;
    },
    deleteDocument: (id) => {
      setData((current) => ({ ...current, documents: current.documents.filter((document) => document.id !== id) }));
      if (supabase) void supabase.from("commercial_documents").delete().eq("id", id).then(({ error }) => { if (error) report(error); });
    },
    importData: (imported) => {
      const migrated = remapLocalData(imported);
      setData(migrated);
      const client = supabase;
      if (client && user) void replaceNetworkData(client, user.id, migrated).then(() => loadNetworkData(client)).then(setData).catch(report);
    },
    clearData: () => {
      setData(emptyData);
      void (async () => {
        if (!supabase) return;
        const { error } = await supabase.from("people").delete().neq("id", "00000000-0000-0000-0000-000000000000");
        if (error) throw error;
        const { error: eventError } = await supabase.from("events").delete().neq("id", "00000000-0000-0000-0000-000000000000");
        if (eventError) throw eventError;
      })().catch(report);
    },
    signOut: () => { if (supabase) void supabase.auth.signOut(); },
  }), [data, hydrated, syncError, user]);

  if (!isSupabaseConfigured) {
    return <main className="grid min-h-screen place-items-center p-6 text-center"><div><h1 className="text-xl font-semibold">Supabase is not configured</h1><p className="mt-2 text-sm text-slate-500">Add the project URL and publishable key to .env.local.</p></div></main>;
  }
  if (!authReady) return <main className="grid min-h-screen place-items-center text-sm text-slate-500">Connecting to Supabase...</main>;
  if (!user) return <AuthScreen />;

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useNetwork() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useNetwork must be used within AppProvider");
  return context;
}
