import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { FOCUS_AREAS, RELATIONSHIP_STATUSES } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 120;

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const editableFields = [
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

function parseJson(content: string) {
  const trimmed = content.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  return JSON.parse(trimmed);
}

function sanitizeUpdates(value: unknown, peopleIds: Set<string>) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const raw = item as Record<string, unknown>;
    const personId = typeof raw.personId === "string" ? raw.personId : "";
    if (!peopleIds.has(personId) || !raw.changes || typeof raw.changes !== "object") return [];

    const changes = Object.fromEntries(
      Object.entries(raw.changes as Record<string, unknown>).filter(([key, fieldValue]) => {
        if (!editableFields.includes(key)) return false;
        if (key === "contextLevel") return [1, 2, 3, 4, 5].includes(Number(fieldValue));
        if (key === "focusArea") return FOCUS_AREAS.includes(fieldValue as never);
        if (key === "relationshipStatus") return RELATIONSHIP_STATUSES.includes(fieldValue as never);
        if (key === "tags") return Array.isArray(fieldValue) && fieldValue.every((tag) => typeof tag === "string");
        if (key === "context") return Boolean(fieldValue) && typeof fieldValue === "object" && !Array.isArray(fieldValue);
        return typeof fieldValue === "string";
      }),
    );

    if (!Object.keys(changes).length) return [];
    return [{
      personId,
      reason: typeof raw.reason === "string" ? raw.reason : "Profile update suggested from your instruction.",
      changes,
    }];
  });
}

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization");
    const accessToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!accessToken || !supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const authClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await authClient.auth.getUser(accessToken);
    if (authError || !authData.user) {
      return NextResponse.json({ error: "Your session is invalid or expired." }, { status: 401 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI chat is not configured. Add OPENROUTER_API_KEY." }, { status: 503 });
    }

    const body = await request.json();
    const messages = Array.isArray(body.messages)
      ? body.messages.filter((message: ChatMessage) => ["user", "assistant"].includes(message.role) && typeof message.content === "string").slice(-8)
      : [];
    const people = Array.isArray(body.people) ? body.people.slice(0, 200) : [];
    if (!messages.length) return NextResponse.json({ error: "Add a message." }, { status: 400 });

    const openRouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Title": "Network OS",
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || "openai/gpt-oss-120b:free",
        messages: [
          {
            role: "system",
            content: [
              "You update a private relationship CRM.",
              "Return only valid JSON with this shape:",
              "{\"reply\":\"short user-facing response\",\"updates\":[{\"personId\":\"id\",\"reason\":\"why\",\"changes\":{}}]}",
              `Editable fields: ${editableFields.join(", ")}.`,
              `Valid focusArea values: ${FOCUS_AREAS.join(", ")}.`,
              `Valid relationshipStatus values: ${RELATIONSHIP_STATUSES.join(", ")}.`,
              "Only suggest updates when the user's instruction clearly identifies a person and a change.",
              "Do not invent facts. If unclear, put no updates and ask a brief clarifying question in reply.",
            ].join("\n"),
          },
          { role: "user", content: `Current people JSON:\n${JSON.stringify(people)}` },
          ...messages,
        ],
        response_format: { type: "json_object" },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(90_000),
    });

    if (!openRouterResponse.ok) {
      const detail = (await openRouterResponse.text()).slice(0, 500);
      console.error("OpenRouter failed:", openRouterResponse.status, detail);
      return NextResponse.json({ error: `OpenRouter failed with status ${openRouterResponse.status}.` }, { status: 502 });
    }

    const result = await openRouterResponse.json();
    const content = result?.choices?.[0]?.message?.content;
    if (typeof content !== "string") throw new Error("OpenRouter returned no message content.");

    const parsed = parseJson(content);
    const peopleIds = new Set<string>(
      people.map((person: { id?: string }) => person.id).filter((id: string | undefined): id is string => Boolean(id)),
    );
    return NextResponse.json({
      reply: typeof parsed.reply === "string" ? parsed.reply : "I reviewed your network.",
      updates: sanitizeUpdates(parsed.updates, peopleIds),
    });
  } catch (error) {
    console.error("AI chat error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI chat failed." },
      { status: 500 },
    );
  }
}
