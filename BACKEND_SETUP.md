# Backend setup

## Supabase

1. Create a Supabase project.
2. Open the SQL editor and run `supabase/schema.sql`.
3. Copy `.env.example` to `.env.local` and add the project URL and keys.
4. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only. Never prefix it with `NEXT_PUBLIC_`.

The migration creates Auth-owned people, interactions, follow-ups, events, commercial
documents, connections, LinkedIn import audit records, RLS policies, and private `avatars`
and `banners` buckets.
Store image objects under `{auth_user_id}/{file_name}` so the storage policies apply.

If the browser console shows `PGRST205` for `public.commercial_documents`, the app is
connected to a Supabase project that has not run the latest `supabase/schema.sql`. Run the
SQL file again in Supabase SQL editor so PostgREST can see the commercial document tables.

## Apify LinkedIn import

1. Choose an Apify Actor that accepts public LinkedIn profile URLs and review its terms,
   input schema, output fields, pricing, and applicable privacy requirements.
2. Set `APIFY_API_TOKEN` and `APIFY_LINKEDIN_ACTOR_ID` in `.env.local`.
3. Set `APIFY_LINKEDIN_INPUT_TEMPLATE` to the Actor's JSON input. Use `{{url}}` where
   the submitted profile URL belongs.
4. Restart the Next.js server and use **Import from LinkedIn** in the person form.

The API token is only read by `app/api/linkedin/import/route.ts`. The browser calls the
local API route and never receives the token.

## AI relationship analysis

Set `OPENAI_API_KEY` in `.env.local`. The server sends the normalized LinkedIn result
and the user's meeting notes to the OpenAI Responses API using strict structured output.
The model proposes a short summary and maps evidence into the relationship context
fields. The user reviews and edits the proposal before saving.

The original meeting notes remain in the person's `notes` field and are not replaced by
the generated summary. The API route requires a valid Supabase user session.
