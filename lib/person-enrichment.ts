import { FOCUS_AREAS, PersonContext, PersonInput, RELATIONSHIP_STATUSES } from "@/types";

type UnknownRecord = Record<string, unknown>;

export interface PersonEnrichment {
  name: string;
  role: string;
  business: string;
  location: string;
  community: string;
  tags: string[];
  focusArea: PersonInput["focusArea"];
  relationshipStatus: PersonInput["relationshipStatus"];
  contextLevel: PersonInput["contextLevel"];
  context: PersonContext;
}

const contextProperties = {
  summary: { type: "string", description: "A concise 2-4 sentence relationship summary." },
  past: { type: "string", description: "Relevant professional and personal background." },
  present: { type: "string", description: "Current role, projects, priorities, and situation." },
  future: { type: "string", description: "Likely goals and stated future plans. Do not invent." },
  personality: { type: "string", description: "Observed communication or personality signals, stated cautiously." },
  beliefs: { type: "string", description: "Values or beliefs supported by the provided information." },
  drives: { type: "string", description: "Motivations and professional drivers supported by the sources." },
  opportunities: { type: "string", description: "Concrete ways the user and this person may help each other." },
  risks: { type: "string", description: "Sensitive points, uncertainties, open questions, or reminders." },
} as const;

const enrichmentSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    role: { type: "string" },
    business: { type: "string" },
    location: { type: "string" },
    community: { type: "string" },
    tags: { type: "array", items: { type: "string" }, maxItems: 10 },
    focusArea: { type: "string", enum: FOCUS_AREAS },
    relationshipStatus: { type: "string", enum: RELATIONSHIP_STATUSES },
    contextLevel: { type: "integer", minimum: 1, maximum: 5 },
    context: {
      type: "object",
      additionalProperties: false,
      properties: contextProperties,
      required: Object.keys(contextProperties),
    },
  },
  required: ["name", "role", "business", "location", "community", "tags", "focusArea", "relationshipStatus", "contextLevel", "context"],
} as const;

function fallback(base: Partial<PersonInput>, meetingNotes: string): PersonEnrichment {
  const context = base.context || {
    summary: "",
    past: "",
    present: "",
    future: "",
    personality: "",
    beliefs: "",
    drives: "",
    opportunities: "",
    risks: "",
  };
  const summaryParts = [
    [base.name, base.role && `works as ${base.role}`, base.business && `at ${base.business}`].filter(Boolean).join(" "),
    meetingNotes.trim(),
  ].filter(Boolean);

  return {
    name: base.name || "",
    role: base.role || "",
    business: base.business || "",
    location: base.location || "",
    community: base.community || "",
    tags: base.tags || [],
    focusArea: base.focusArea || "Other",
    relationshipStatus: base.relationshipStatus || "New contact",
    contextLevel: base.contextLevel || (meetingNotes.trim() ? 3 : 2),
    context: {
      summary: context.summary || summaryParts.join(". ").slice(0, 700),
      past: context.past || "",
      present: context.present || "",
      future: context.future || "",
      personality: context.personality || "",
      beliefs: context.beliefs || "",
      drives: context.drives || "",
      opportunities: context.opportunities || "",
      risks: context.risks || "",
    },
  };
}

function outputText(response: UnknownRecord) {
  if (typeof response.output_text === "string") return response.output_text;
  const output = Array.isArray(response.output) ? response.output : [];
  for (const item of output) {
    const content = item && typeof item === "object" && Array.isArray((item as UnknownRecord).content)
      ? (item as UnknownRecord).content as unknown[]
      : [];
    for (const part of content) {
      if (part && typeof part === "object" && typeof (part as UnknownRecord).text === "string") {
        return (part as UnknownRecord).text as string;
      }
    }
  }
  return "";
}

export async function enrichPerson(
  base: Partial<PersonInput>,
  rawLinkedIn: UnknownRecord,
  meetingNotes: string,
): Promise<{ enrichment: PersonEnrichment; aiUsed: boolean; warning?: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      enrichment: fallback(base, meetingNotes),
      aiUsed: false,
      warning: "OpenAI is not configured, so LinkedIn fields were mapped without AI analysis.",
    };
  }

  const source = JSON.stringify(rawLinkedIn).slice(0, 30_000);
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      store: false,
      instructions: [
        "You are a relationship intelligence analyst.",
        "Combine LinkedIn facts with the user's first-hand meeting notes.",
        "The meeting notes are the strongest source for personal observations; LinkedIn is strongest for career facts.",
        "Write a useful but brief summary. Map information into every context field, using an empty string when evidence is absent.",
        "Do not invent facts, diagnoses, sensitive traits, or certainty. State tentative inferences cautiously.",
        "Preserve the user's meaning, but do not repeat all raw notes.",
        "Choose focusArea and relationshipStatus conservatively.",
      ].join(" "),
      input: [{
        role: "user",
        content: [{
          type: "input_text",
          text: `CURRENT FORM DATA:\n${JSON.stringify(base)}\n\nUSER'S MEETING NOTES:\n${meetingNotes || "(none)"}\n\nLINKEDIN SCRAPER DATA:\n${source}`,
        }],
      }],
      text: {
        format: {
          type: "json_schema",
          name: "person_enrichment",
          strict: true,
          schema: enrichmentSchema,
        },
      },
    }),
    signal: AbortSignal.timeout(90_000),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    console.error("OpenAI person enrichment failed:", response.status, detail);
    return {
      enrichment: fallback(base, meetingNotes),
      aiUsed: false,
      warning: "AI analysis failed, so the LinkedIn data was mapped without AI.",
    };
  }

  const body = await response.json() as UnknownRecord;
  const text = outputText(body);
  if (!text) {
    return {
      enrichment: fallback(base, meetingNotes),
      aiUsed: false,
      warning: "AI returned no analysis, so the LinkedIn data was mapped without AI.",
    };
  }

  try {
    return { enrichment: JSON.parse(text) as PersonEnrichment, aiUsed: true };
  } catch {
    return {
      enrichment: fallback(base, meetingNotes),
      aiUsed: false,
      warning: "AI returned invalid analysis, so the LinkedIn data was mapped without AI.",
    };
  }
}
