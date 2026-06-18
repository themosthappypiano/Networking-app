import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 120;

type UnknownRecord = Record<string, unknown>;

const invoiceSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    type: { type: "string", enum: ["Invoice", "Proposal"] },
    title: { type: "string" },
    amount: { type: "number" },
    currency: { type: "string" },
    status: { type: "string", enum: ["Draft", "Sent", "Viewed", "Accepted", "Declined", "Paid"] },
    sentDate: { type: "string" },
    dueDate: { type: "string" },
    notes: { type: "string" },
    tags: { type: "array", items: { type: "string" }, maxItems: 8 },
    personIds: { type: "array", items: { type: "string" }, maxItems: 8 },
  },
  required: ["type", "title", "amount", "currency", "status", "sentDate", "dueDate", "notes", "tags", "personIds"],
} as const;

function outputText(response: UnknownRecord) {
  if (typeof response.output_text === "string") return response.output_text;
  const output = Array.isArray(response.output) ? response.output : [];
  for (const item of output) {
    const content = item && typeof item === "object" && Array.isArray((item as UnknownRecord).content)
      ? (item as UnknownRecord).content as unknown[]
      : [];
    for (const part of content) {
      if (part && typeof part === "object" && typeof (part as UnknownRecord).text === "string") return (part as UnknownRecord).text as string;
    }
  }
  return "";
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

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Invoice AI is not configured. Add OPENAI_API_KEY." }, { status: 503 });

    const body = await request.json();
    const fileName = typeof body.fileName === "string" ? body.fileName : "invoice";
    const mimeType = typeof body.mimeType === "string" ? body.mimeType : "application/octet-stream";
    const dataUrl = typeof body.dataUrl === "string" ? body.dataUrl : "";
    const people = Array.isArray(body.people) ? body.people.slice(0, 300) : [];
    if (!dataUrl.startsWith("data:")) return NextResponse.json({ error: "Upload a valid invoice file." }, { status: 400 });

    const filePart = mimeType.startsWith("image/")
      ? { type: "input_image", image_url: dataUrl, detail: "high" }
      : { type: "input_file", filename: fileName, file_data: dataUrl };

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
          "Extract invoice or proposal details for a CRM form.",
          "Return JSON only using the schema.",
          "Use an empty string for unknown dates. Use ISO date format YYYY-MM-DD when a date is visible.",
          "Use the final total amount due or proposal total. Currency must be a 3-letter ISO code when possible.",
          "Match recipients only to supplied people IDs when the document clearly names the person, company, or project.",
          "Do not invent recipients or amounts.",
        ].join(" "),
        input: [{
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Known people JSON:\n${JSON.stringify(people)}\n\nAnalyze the attached invoice/proposal and prefill the CRM fields.`,
            },
            filePart,
          ],
        }],
        text: {
          format: {
            type: "json_schema",
            name: "invoice_analysis",
            strict: true,
            schema: invoiceSchema,
          },
        },
      }),
      signal: AbortSignal.timeout(90_000),
    });

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500);
      console.error("OpenAI invoice analysis failed:", response.status, detail);
      return NextResponse.json({ error: `Invoice analysis failed with status ${response.status}.` }, { status: 502 });
    }

    const text = outputText(await response.json() as UnknownRecord);
    if (!text) return NextResponse.json({ error: "Invoice analysis returned no data." }, { status: 502 });
    return NextResponse.json(JSON.parse(text));
  } catch (error) {
    console.error("Invoice analysis error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invoice analysis failed." },
      { status: 500 },
    );
  }
}
