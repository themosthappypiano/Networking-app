import { SupabaseClient } from "@supabase/supabase-js";
import { CommercialDocument, FollowUp, Interaction, NetworkData, NetworkEvent, Person, PersonContext } from "@/types";
import { emptyContext } from "@/utils";

const colors = [
  "from-fuchsia-500 to-violet-600",
  "from-cyan-500 to-blue-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-red-600",
  "from-violet-500 to-indigo-600",
];

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

async function imageUrl(client: SupabaseClient, value: string | null) {
  if (!value || value.startsWith("http") || value.startsWith("data:")) return value || "";
  const [bucket, ...parts] = value.split(":");
  const { data, error } = await client.storage.from(bucket).createSignedUrl(parts.join(":"), 60 * 60 * 24 * 7);
  if (error) throw new Error(`Could not load ${bucket} image: ${error.message}`);
  return data?.signedUrl || "";
}

async function imageUrls(client: SupabaseClient, values: string[] | null) {
  return Promise.all((values || []).map((value) => imageUrl(client, value)));
}

function isMissingTable(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "42P01");
}

export async function uploadDataImage(client: SupabaseClient, userId: string, bucket: "avatars" | "banners", value?: string) {
  if (!value || !value.startsWith("data:")) return value || null;
  const response = await fetch(value);
  const blob = await response.blob();
  const path = `${userId}/${crypto.randomUUID()}.jpg`;
  const { error } = await client.storage.from(bucket).upload(path, blob, { contentType: "image/jpeg", upsert: false });
  if (error) throw new Error(`Could not upload to the ${bucket} bucket: ${error.message}`);
  return `${bucket}:${path}`;
}

export async function loadNetworkData(client: SupabaseClient): Promise<NetworkData> {
  const [peopleResult, interactionsResult, followUpsResult, eventsResult, documentsResult, eventPeopleResult, documentPeopleResult, connectionsResult] = await Promise.all([
    client.from("people").select("*").order("created_at", { ascending: false }),
    client.from("interactions").select("*").order("interaction_date", { ascending: false }),
    client.from("follow_ups").select("*").order("due_date"),
    client.from("events").select("*").order("event_date", { ascending: false }),
    client.from("commercial_documents").select("*").order("sent_date", { ascending: false }),
    client.from("event_people").select("event_id, person_id"),
    client.from("commercial_document_people").select("document_id, person_id"),
    client.from("person_connections").select("person_id, connected_person_id"),
  ]);

  const documentError = isMissingTable(documentsResult.error) ? null : documentsResult.error;
  const documentPeopleError = isMissingTable(documentPeopleResult.error) ? null : documentPeopleResult.error;
  const error = peopleResult.error || interactionsResult.error || followUpsResult.error
    || eventsResult.error || documentError || eventPeopleResult.error || documentPeopleError || connectionsResult.error;
  if (error) throw error;

  const people = await Promise.all((peopleResult.data || []).map(async (row, index): Promise<Person> => ({
    id: row.id,
    name: row.name,
    initials: initials(row.name),
    avatarColor: colors[index % colors.length],
    avatarUrl: await imageUrl(client, row.avatar_path),
    avatarPath: row.avatar_path || "",
    bannerUrl: await imageUrl(client, row.banner_path),
    bannerPath: row.banner_path || "",
    galleryUrls: await imageUrls(client, row.gallery_paths),
    galleryPaths: row.gallery_paths || [],
    linkedinUrl: row.linkedin_url || "",
    community: row.community,
    role: row.role,
    business: row.business,
    location: row.location,
    contextLevel: row.context_level,
    focusArea: row.focus_area,
    relationshipStatus: row.relationship_status,
    lastInteractionDate: row.last_interaction_date || "",
    nextFollowUpDate: row.next_follow_up_date || "",
    tags: row.tags || [],
    notes: row.notes,
    howWeMet: row.how_we_met,
    introducedBy: row.introduced_by,
    connectedPeopleIds: (connectionsResult.data || []).filter((item) => item.person_id === row.id).map((item) => item.connected_person_id),
    eventIds: (eventPeopleResult.data || []).filter((item) => item.person_id === row.id).map((item) => item.event_id),
    context: { ...emptyContext, ...(row.context as Partial<PersonContext>) },
  })));

  const interactions: Interaction[] = (interactionsResult.data || []).map((row) => ({
    id: row.id,
    personId: row.person_id,
    date: row.interaction_date,
    type: row.type,
    summary: row.summary,
    keyPoints: row.key_points,
    decisions: row.decisions,
    actionsAgreed: row.actions_agreed,
    personalDetails: row.personal_details,
  }));

  const followUps: FollowUp[] = (followUpsResult.data || []).map((row) => ({
    id: row.id,
    personId: row.person_id,
    title: row.title,
    dueDate: row.due_date || "",
    priority: row.priority,
    status: row.status,
    notes: row.notes,
  }));

  const events: NetworkEvent[] = (eventsResult.data || []).map((row) => ({
    id: row.id,
    name: row.name,
    location: row.location,
    date: row.event_date || "",
    description: row.description,
    peopleIds: (eventPeopleResult.data || []).filter((item) => item.event_id === row.id).map((item) => item.person_id),
    notes: row.notes,
    outcomes: row.outcomes,
  }));

  const documents: CommercialDocument[] = (documentsResult.data || []).map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    amount: Number(row.amount || 0),
    currency: row.currency,
    status: row.status,
    sentDate: row.sent_date || "",
    dueDate: row.due_date || "",
    personIds: (documentPeopleResult.data || []).filter((item) => item.document_id === row.id).map((item) => item.person_id),
    tags: row.tags || [],
    notes: row.notes,
    link: row.link,
  }));

  return { people, interactions, followUps, events, documents };
}

export function personRow(person: Person, avatarPath?: string | null, bannerPath?: string | null, galleryPaths?: string[]) {
  return {
    id: person.id,
    name: person.name,
    avatar_path: avatarPath === undefined ? person.avatarPath ?? person.avatarUrl ?? null : avatarPath,
    banner_path: bannerPath === undefined ? person.bannerPath ?? person.bannerUrl ?? null : bannerPath,
    gallery_paths: galleryPaths === undefined ? person.galleryPaths ?? person.galleryUrls ?? [] : galleryPaths,
    linkedin_url: person.linkedinUrl || null,
    community: person.community,
    role: person.role,
    business: person.business,
    location: person.location,
    context_level: person.contextLevel,
    focus_area: person.focusArea,
    relationship_status: person.relationshipStatus,
    last_interaction_date: person.lastInteractionDate || null,
    next_follow_up_date: person.nextFollowUpDate || null,
    tags: person.tags,
    notes: person.notes,
    how_we_met: person.howWeMet,
    introduced_by: person.introducedBy,
    context: person.context,
  };
}

export function interactionRow(item: Interaction) {
  return {
    id: item.id, person_id: item.personId, interaction_date: item.date, type: item.type,
    summary: item.summary, key_points: item.keyPoints, decisions: item.decisions,
    actions_agreed: item.actionsAgreed, personal_details: item.personalDetails,
  };
}

export function followUpRow(item: FollowUp) {
  return {
    id: item.id, person_id: item.personId, title: item.title, due_date: item.dueDate || null,
    priority: item.priority, status: item.status, notes: item.notes,
  };
}

export function eventRow(item: NetworkEvent) {
  return {
    id: item.id, name: item.name, location: item.location, event_date: item.date || null,
    description: item.description, notes: item.notes, outcomes: item.outcomes,
  };
}

export function commercialDocumentRow(item: CommercialDocument) {
  return {
    id: item.id,
    type: item.type,
    title: item.title,
    amount: item.amount,
    currency: item.currency,
    status: item.status,
    sent_date: item.sentDate || null,
    due_date: item.dueDate || null,
    tags: item.tags,
    notes: item.notes,
    link: item.link,
  };
}

export async function replaceNetworkData(client: SupabaseClient, userId: string, data: NetworkData) {
  const peopleRows = await Promise.all(data.people.map(async (person) => {
    const avatarPath = await uploadDataImage(client, userId, "avatars", person.avatarUrl);
    const bannerPath = await uploadDataImage(client, userId, "banners", person.bannerUrl);
    const galleryPaths = await Promise.all((person.galleryUrls || []).map((url) => uploadDataImage(client, userId, "avatars", url)));
    return personRow(person, avatarPath, bannerPath, galleryPaths.filter(Boolean) as string[]);
  }));

  if (peopleRows.length) {
    const { error } = await client.from("people").upsert(peopleRows);
    if (error) throw error;
  }
  if (data.events.length) {
    const { error } = await client.from("events").upsert(data.events.map(eventRow));
    if (error) throw error;
  }
  if (data.interactions.length) {
    const { error } = await client.from("interactions").upsert(data.interactions.map(interactionRow));
    if (error) throw error;
  }
  if (data.followUps.length) {
    const { error } = await client.from("follow_ups").upsert(data.followUps.map(followUpRow));
    if (error) throw error;
  }
  if ((data.documents || []).length) {
    const { error } = await client.from("commercial_documents").upsert(data.documents.map(commercialDocumentRow));
    if (error) throw error;
  }

  const eventPeople = data.events.flatMap((event) => event.peopleIds.map((personId) => ({
    event_id: event.id,
    person_id: personId,
  })));
  if (eventPeople.length) {
    const { error } = await client.from("event_people").upsert(eventPeople);
    if (error) throw error;
  }

  const documentPeople = (data.documents || []).flatMap((document) => document.personIds.map((personId) => ({
    document_id: document.id,
    person_id: personId,
  })));
  if (documentPeople.length) {
    const { error } = await client.from("commercial_document_people").upsert(documentPeople);
    if (error) throw error;
  }

  const connections = data.people.flatMap((person) => person.connectedPeopleIds.map((connectedPersonId) => ({
    person_id: person.id,
    connected_person_id: connectedPersonId,
  })));
  if (connections.length) {
    const { error } = await client.from("person_connections").upsert(connections);
    if (error) throw error;
  }
}

export function remapLocalData(data: NetworkData): NetworkData {
  const personIds = new Map(data.people.map((item) => [item.id, crypto.randomUUID()]));
  const eventIds = new Map(data.events.map((item) => [item.id, crypto.randomUUID()]));
  return {
    people: data.people.map((person) => ({
      ...person,
      id: personIds.get(person.id)!,
      connectedPeopleIds: person.connectedPeopleIds.map((id) => personIds.get(id)).filter(Boolean) as string[],
      eventIds: person.eventIds.map((id) => eventIds.get(id)).filter(Boolean) as string[],
    })),
    interactions: data.interactions.map((item) => ({ ...item, id: crypto.randomUUID(), personId: personIds.get(item.personId)! })).filter((item) => item.personId),
    followUps: data.followUps.map((item) => ({ ...item, id: crypto.randomUUID(), personId: personIds.get(item.personId)! })).filter((item) => item.personId),
    documents: (data.documents || []).map((document) => ({
      ...document,
      id: crypto.randomUUID(),
      personIds: document.personIds.map((id) => personIds.get(id)).filter(Boolean) as string[],
    })),
    events: data.events.map((event) => ({
      ...event,
      id: eventIds.get(event.id)!,
      peopleIds: event.peopleIds.map((id) => personIds.get(id)).filter(Boolean) as string[],
    })),
  };
}
