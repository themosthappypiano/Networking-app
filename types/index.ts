export const FOCUS_AREAS = [
  "Attract",
  "Convert",
  "Deliver",
  "Operations",
  "Partnerships",
  "Investor",
  "Friend",
  "Other",
] as const;

export const RELATIONSHIP_STATUSES = [
  "New contact",
  "Warm",
  "Strong relationship",
  "Client",
  "Potential client",
  "Partner",
  "Needs follow-up",
] as const;

export const INTERACTION_TYPES = [
  "Event meeting",
  "Call",
  "DM",
  "WhatsApp",
  "Email",
  "In-person",
] as const;

export type FocusArea = (typeof FOCUS_AREAS)[number];
export type RelationshipStatus = (typeof RELATIONSHIP_STATUSES)[number];
export type InteractionType = (typeof INTERACTION_TYPES)[number];
export type Priority = "Low" | "Medium" | "High";
export type ActionStatus = "Todo" | "In progress" | "Done";
export type CommercialDocumentType = "Invoice" | "Proposal";
export type CommercialDocumentStatus = "Draft" | "Sent" | "Viewed" | "Accepted" | "Declined" | "Paid";

export interface PersonContext {
  summary: string;
  past: string;
  present: string;
  future: string;
  personality: string;
  beliefs: string;
  drives: string;
  opportunities: string;
  risks: string;
}

export interface Person {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  avatarUrl?: string;
  avatarPath?: string;
  bannerUrl?: string;
  bannerPath?: string;
  galleryUrls: string[];
  galleryPaths?: string[];
  linkedinUrl?: string;
  community: string;
  role: string;
  business: string;
  location: string;
  contextLevel: 1 | 2 | 3 | 4 | 5;
  focusArea: FocusArea;
  relationshipStatus: RelationshipStatus;
  lastInteractionDate: string;
  nextFollowUpDate: string;
  tags: string[];
  notes: string;
  howWeMet: string;
  introducedBy: string;
  connectedPeopleIds: string[];
  eventIds: string[];
  context: PersonContext;
}

export interface Interaction {
  id: string;
  personId: string;
  date: string;
  type: InteractionType;
  summary: string;
  keyPoints: string;
  decisions: string;
  actionsAgreed: string;
  personalDetails: string;
}

export interface FollowUp {
  id: string;
  personId: string;
  title: string;
  dueDate: string;
  priority: Priority;
  status: ActionStatus;
  notes: string;
}

export interface NetworkEvent {
  id: string;
  name: string;
  location: string;
  date: string;
  description: string;
  peopleIds: string[];
  notes: string;
  outcomes: string;
}

export interface CommercialDocument {
  id: string;
  type: CommercialDocumentType;
  title: string;
  amount: number;
  currency: string;
  status: CommercialDocumentStatus;
  sentDate: string;
  dueDate: string;
  personIds: string[];
  tags: string[];
  notes: string;
  link: string;
}

export interface NetworkData {
  people: Person[];
  interactions: Interaction[];
  followUps: FollowUp[];
  events: NetworkEvent[];
  documents: CommercialDocument[];
}

export type PersonInput = Omit<
  Person,
  "id" | "initials" | "avatarColor" | "connectedPeopleIds" | "eventIds"
> & {
  id?: string;
  connectedPeopleIds?: string[];
  eventIds?: string[];
};
