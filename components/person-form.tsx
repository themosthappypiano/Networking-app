"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { Camera, CheckCircle2, ImagePlus, Linkedin, Loader2, Sparkles, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useNetwork } from "@/components/app-provider";
import { emptyContext } from "@/utils";
import { FOCUS_AREAS, Person, PersonInput, RELATIONSHIP_STATUSES } from "@/types";
import { prepareProfilePhoto } from "@/utils/image";
import { supabase } from "@/lib/supabase";

const defaultPerson: PersonInput = {
  name: "",
  avatarUrl: "",
  bannerUrl: "",
  galleryUrls: [],
  linkedinUrl: "",
  community: "",
  role: "",
  business: "",
  location: "",
  contextLevel: 1,
  focusArea: "Other",
  relationshipStatus: "New contact",
  lastInteractionDate: new Date().toISOString().slice(0, 10),
  nextFollowUpDate: "",
  tags: [],
  notes: "",
  howWeMet: "",
  introducedBy: "",
  context: emptyContext,
};

export function PersonForm({ person, onDone }: { person?: Person; onDone: () => void }) {
  const { savePerson } = useNetwork();
  const router = useRouter();
  const [form, setForm] = useState<PersonInput>(person
    ? { ...person, galleryUrls: person.galleryUrls || [], context: { ...emptyContext, ...person.context } }
    : defaultPerson);
  const [tags, setTags] = useState(person?.tags.join(", ") || "");
  const [photoError, setPhotoError] = useState("");
  const [galleryError, setGalleryError] = useState("");
  const [importError, setImportError] = useState("");
  const [analysisMessage, setAnalysisMessage] = useState("");
  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  function update<K extends keyof PersonInput>(key: K, value: PersonInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setSaveError("");
    try {
      const id = await savePerson({ ...form, tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean) });
      onDone();
      if (!person) router.push(`/people/${id}`);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "The profile could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPhotoError("");
    try {
      update("avatarUrl", await prepareProfilePhoto(file));
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : "The photo could not be added.");
    }
    event.target.value = "";
  }

  async function handleGallery(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setGalleryError("");
    try {
      const prepared = await Promise.all(files.map((file) => prepareProfilePhoto(file)));
      update("galleryUrls", [...(form.galleryUrls || []), ...prepared]);
    } catch (error) {
      setGalleryError(error instanceof Error ? error.message : "The photos could not be added.");
    }
    event.target.value = "";
  }

  function removeGalleryPhoto(index: number) {
    update("galleryUrls", (form.galleryUrls || []).filter((_, photoIndex) => photoIndex !== index));
  }

  async function importLinkedIn() {
    if (!(form.linkedinUrl || "").trim() && !form.notes.trim()) {
      setImportError("Add a LinkedIn profile URL or write what you know about this person.");
      return;
    }

    setImporting(true);
    setImportError("");
    setAnalysisMessage("");
    try {
      const client = supabase;
      if (!client) throw new Error("Supabase is not configured.");
      const { data: sessionData, error: sessionError } = await client.auth.getSession();
      if (sessionError) throw sessionError;

      let session = sessionData.session;
      const expiresSoon = !session?.expires_at || session.expires_at <= Math.floor(Date.now() / 1000) + 60;
      if (session && expiresSoon) {
        const { data: refreshed, error: refreshError } = await client.auth.refreshSession(session);
        if (refreshError) throw refreshError;
        session = refreshed.session;
      }

      const accessToken = session?.access_token;
      if (!accessToken) {
        await client.auth.signOut();
        throw new Error("Your session expired. Please sign in again.");
      }
      const response = await fetch("/api/linkedin/import", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: form.linkedinUrl,
          meetingNotes: form.notes,
          current: form,
        }),
      });
      const body = await response.json();
      if (response.status === 401) {
        await client.auth.signOut();
        throw new Error("Your session expired. Please sign in again.");
      }
      if (!response.ok) throw new Error(body.error || "LinkedIn import failed.");

      const imported = body.person as Partial<PersonInput>;
      setForm((current) => ({
        ...current,
        ...imported,
        linkedinUrl: imported.linkedinUrl || current.linkedinUrl,
        avatarUrl: imported.avatarUrl || current.avatarUrl,
        bannerUrl: current.bannerUrl,
        context: { ...current.context, ...imported.context },
      }));
      if (imported.tags) setTags(imported.tags.join(", "));
      setAnalysisMessage(body.aiUsed
        ? "AI analysis is ready. Review the suggested fields before saving."
        : body.warning || "LinkedIn data is ready. Review it before saving.");
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Analysis failed.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-7">
      <div>
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-lime">Core details</p>
        <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-line bg-slate-50 p-4 sm:flex-row sm:items-center">
          <div className={`grid h-28 w-28 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br ${person?.avatarColor || "from-slate-700 to-slate-900"} text-2xl font-semibold text-white`}>
            {form.avatarUrl ? <img src={form.avatarUrl} alt="Profile preview" className="h-full w-full object-cover" /> : <Camera size={24} className="text-slate-950/40" />}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-950">Profile picture</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">Upload a clear portrait. It will be resized and stored privately in Supabase.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <label className="button-secondary h-9 cursor-pointer px-3 text-xs">
                <ImagePlus size={14} /> {form.avatarUrl ? "Change photo" : "Upload photo"}
                <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
              </label>
              {form.avatarUrl && <button type="button" onClick={() => update("avatarUrl", "")} className="inline-flex h-9 items-center gap-2 rounded-xl px-3 text-xs text-slate-500 transition hover:bg-red-400/10 hover:text-red-700"><Trash2 size={13} /> Remove</button>}
            </div>
            {photoError && <p className="mt-2 text-xs text-red-700">{photoError}</p>}
          </div>
        </div>
        <div className="mb-6 rounded-2xl border border-line bg-slate-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900">Profile photos</p>
              <p className="mt-1 text-xs text-slate-500">Add photos you want to see together on this profile.</p>
              {galleryError && <p className="mt-2 text-xs text-red-600">{galleryError}</p>}
            </div>
            <label className="button-secondary h-9 cursor-pointer px-3 text-xs">
              <ImagePlus size={14} /> Add photos
              <input type="file" accept="image/*" multiple onChange={handleGallery} className="hidden" />
            </label>
          </div>
          {(form.galleryUrls || []).length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {(form.galleryUrls || []).map((url, index) => (
                <div key={`${url}-${index}`} className="group relative aspect-square overflow-hidden rounded-xl border border-line bg-white">
                  <img src={url} alt={`Profile photo ${index + 1}`} className="h-full w-full object-cover" />
                  <button type="button" onClick={() => removeGalleryPhoto(index)} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-slate-600 opacity-0 shadow-sm transition hover:text-red-700 group-hover:opacity-100">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="mb-6 rounded-2xl border border-[#0a66c2]/20 bg-[#0a66c2]/[0.04] p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-900"><Sparkles size={17} className="text-[#0a66c2]" /> AI relationship analysis</div>
          <p className="mt-1 text-xs leading-5 text-slate-500">Add a LinkedIn profile when you have one, or just write what you know. Nothing is saved until you review the result and submit this form.</p>
          <div className="mt-4">
            <label className="label">LinkedIn profile optional</label>
            <div className="flex flex-col gap-2 sm:flex-row">
            <input type="url" className="input flex-1" value={form.linkedinUrl || ""} onChange={(e) => update("linkedinUrl", e.target.value)} placeholder="https://www.linkedin.com/in/..." />
            </div>
          </div>
          <label className="mt-4 block">
            <span className="label">What did you learn when you met?</span>
            <textarea className="textarea min-h-28" value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="What they care about, current priorities, personality, challenges, promises, useful personal details..." />
          </label>
          <button type="button" onClick={importLinkedIn} disabled={importing} className="button-primary mt-3">
            {importing ? <Loader2 size={15} className="animate-spin" /> : <Linkedin size={15} />}
            {importing ? "Analyzing..." : "Fill profile with AI"}
          </button>
          {analysisMessage && <p className="mt-3 flex items-start gap-2 rounded-xl bg-white p-3 text-xs leading-5 text-slate-600"><CheckCircle2 size={15} className="mt-0.5 shrink-0 text-lime" />{analysisMessage}</p>}
          {importError && <p className="mt-2 text-xs text-red-600">{importError}</p>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name"><input required className="input" value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Jordan Lee" /></Field>
          <Field label="Community"><input className="input" value={form.community} onChange={(e) => update("community", e.target.value)} placeholder="Where you know them from" /></Field>
          <Field label="Role"><input className="input" value={form.role} onChange={(e) => update("role", e.target.value)} placeholder="Founder, Designer..." /></Field>
          <Field label="Business / project"><input className="input" value={form.business} onChange={(e) => update("business", e.target.value)} placeholder="Company or project" /></Field>
          <Field label="Location"><input className="input" value={form.location} onChange={(e) => update("location", e.target.value)} placeholder="City, Country" /></Field>
          <Field label="Tags"><input className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="AI, Founder, Local" /></Field>
          <Field label="Focus area">
            <select className="input" value={form.focusArea} onChange={(e) => update("focusArea", e.target.value as PersonInput["focusArea"])}>
              {FOCUS_AREAS.map((area) => <option key={area}>{area}</option>)}
            </select>
          </Field>
          <Field label="Relationship status">
            <select className="input" value={form.relationshipStatus} onChange={(e) => update("relationshipStatus", e.target.value as PersonInput["relationshipStatus"])}>
              {RELATIONSHIP_STATUSES.map((status) => <option key={status}>{status}</option>)}
            </select>
          </Field>
          <Field label={`Context level · ${form.contextLevel}/5`}>
            <input type="range" min="1" max="5" value={form.contextLevel} onChange={(e) => update("contextLevel", Number(e.target.value) as PersonInput["contextLevel"])} className="h-11 w-full accent-lime" />
          </Field>
          <Field label="Last interaction"><input type="date" className="input" value={form.lastInteractionDate} onChange={(e) => update("lastInteractionDate", e.target.value)} /></Field>
          <Field label="Next follow-up"><input type="date" className="input" value={form.nextFollowUpDate} onChange={(e) => update("nextFollowUpDate", e.target.value)} /></Field>
          <Field label="Introduced by"><input className="input" value={form.introducedBy} onChange={(e) => update("introducedBy", e.target.value)} placeholder="Name or source" /></Field>
        </div>
        <div className="mt-4 grid gap-4">
          <Field label="How we met"><textarea className="textarea" value={form.howWeMet} onChange={(e) => update("howWeMet", e.target.value)} placeholder="The origin story of this relationship..." /></Field>
        </div>
      </div>

      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-lime">Context intelligence</p>
        <p className="mb-4 text-sm text-slate-500">Build the structured context that powers the AI summary.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {(Object.keys(emptyContext) as Array<keyof typeof emptyContext>).map((key) => (
            <Field key={key} label={key === "summary" ? "AI relationship summary" : key === "risks" ? "Risks / things to remember" : key}>
              <textarea
                className="textarea min-h-28"
                value={form.context[key]}
                onChange={(e) => update("context", { ...form.context, [key]: e.target.value })}
                placeholder={`Add ${key} context...`}
              />
            </Field>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-line pt-5">
        {saveError && <p className="mr-auto self-center text-sm text-red-600">{saveError}</p>}
        <button type="button" onClick={onDone} className="button-secondary">Cancel</button>
        <button type="submit" disabled={saving} className="button-primary">
          {saving && <Loader2 size={15} className="animate-spin" />}
          {saving ? "Uploading and saving..." : person ? "Save changes" : "Add person"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label><span className="label capitalize">{label}</span>{children}</label>;
}
