import { NextRequest, NextResponse } from "next/server";
import { normalizeLinkedInProfile } from "@/lib/linkedin";
import { enrichPerson } from "@/lib/person-enrichment";
import { PersonInput } from "@/types";
import { createClient } from "@supabase/supabase-js";
import { emptyContext } from "@/utils";

export const runtime = "nodejs";
export const maxDuration = 300;

function isLinkedInProfileUrl(value: string) {
  try {
    const url = new URL(value);
    return ["linkedin.com", "www.linkedin.com"].includes(url.hostname.toLowerCase())
      && url.pathname.toLowerCase().startsWith("/in/");
  } catch {
    return false;
  }
}

function createActorInput(profileUrl: string) {
  const template = process.env.APIFY_LINKEDIN_INPUT_TEMPLATE
    || '{"profileUrls":["{{url}}"]}';

  try {
    return JSON.parse(template.replaceAll("{{url}}", profileUrl));
  } catch {
    throw new Error("APIFY_LINKEDIN_INPUT_TEMPLATE must be valid JSON.");
  }
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

    const body = await request.json();
    const profileUrl = typeof body.url === "string" ? body.url.trim() : "";
    const meetingNotes = typeof body.meetingNotes === "string" ? body.meetingNotes.trim() : "";
    const current = body.current && typeof body.current === "object"
      ? body.current as Partial<PersonInput>
      : {};
    const hasProfileUrl = Boolean(profileUrl);

    if (!hasProfileUrl && !meetingNotes) {
      return NextResponse.json({ error: "Add a LinkedIn profile URL or write what you know about this person." }, { status: 400 });
    }

    if (hasProfileUrl && !isLinkedInProfileUrl(profileUrl)) {
      return NextResponse.json({ error: "Enter a valid linkedin.com/in/... profile URL." }, { status: 400 });
    }

    let rawProfile: Record<string, unknown> = {};
    let linkedIn: Partial<PersonInput> = {};

    if (hasProfileUrl) {
      const token = process.env.APIFY_API_TOKEN;
      const actorId = process.env.APIFY_LINKEDIN_ACTOR_ID;
      if (!token || !actorId) {
        return NextResponse.json(
          { error: "LinkedIn import is not configured. Add APIFY_API_TOKEN and APIFY_LINKEDIN_ACTOR_ID." },
          { status: 503 },
        );
      }

      const endpoint = new URL(`https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items`);
      endpoint.searchParams.set("format", "json");
      endpoint.searchParams.set("clean", "true");
      endpoint.searchParams.set("limit", "1");
      endpoint.searchParams.set("timeout", "240");
      endpoint.searchParams.set("maxItems", "1");
      endpoint.searchParams.set("maxTotalChargeUsd", "0.02");

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(createActorInput(profileUrl)),
        cache: "no-store",
        signal: AbortSignal.timeout(250_000),
      });

      if (!response.ok) {
        const detail = (await response.text()).slice(0, 500);
        console.error("Apify LinkedIn Actor failed:", response.status, detail);
        return NextResponse.json({ error: `The LinkedIn scraper failed with status ${response.status}.` }, { status: 502 });
      }

      const items = await response.json();
      const scrapedProfile = Array.isArray(items) ? items[0] : items;
      if (!scrapedProfile || typeof scrapedProfile !== "object") {
        return NextResponse.json({ error: "The scraper returned no profile data." }, { status: 404 });
      }
      if ("error" in scrapedProfile && typeof scrapedProfile.error === "string") {
        console.error("Apify LinkedIn Actor returned an error item:", scrapedProfile.error);
        return NextResponse.json({ error: scrapedProfile.error }, { status: 502 });
      }

      rawProfile = scrapedProfile as Record<string, unknown>;
      linkedIn = normalizeLinkedInProfile(rawProfile, profileUrl);
    }

    const { enrichment, aiUsed, warning } = await enrichPerson(
      { ...current, ...linkedIn, context: { ...emptyContext, ...current.context, ...linkedIn.context } },
      rawProfile,
      meetingNotes,
    );

    return NextResponse.json({
      person: {
        ...current,
        ...linkedIn,
        ...enrichment,
        name: enrichment.name || linkedIn.name || current.name || "",
        role: enrichment.role || linkedIn.role || current.role || "",
        business: enrichment.business || linkedIn.business || current.business || "",
        location: enrichment.location || linkedIn.location || current.location || "",
        community: enrichment.community || current.community || "",
        linkedinUrl: profileUrl || current.linkedinUrl || "",
        notes: meetingNotes,
        avatarUrl: linkedIn.avatarUrl || current.avatarUrl || "",
        bannerUrl: current.bannerUrl || linkedIn.bannerUrl || "",
        context: enrichment.context,
      },
      aiUsed,
      warning,
    });
  } catch (error) {
    console.error("LinkedIn import error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "LinkedIn import failed." },
      { status: 500 },
    );
  }
}
