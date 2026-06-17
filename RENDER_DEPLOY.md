# Render deployment

This app is ready to deploy as a Render Web Service.

## Settings

- Build command: `npm ci && npm run build`
- Start command: `npm run start`
- Runtime: Node
- Node version: `22`

The included `render.yaml` defines these settings as infrastructure-as-code. In Render,
create a new Blueprint from the GitHub repository or create a Web Service and use the
same commands above.

## Environment variables

Set these in Render before the first deploy:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
APIFY_API_TOKEN
APIFY_LINKEDIN_ACTOR_ID
APIFY_LINKEDIN_INPUT_TEMPLATE
OPENAI_API_KEY
OPENAI_MODEL
```

`OPENAI_MODEL` defaults to `gpt-4.1-mini` in `render.yaml`. The public Supabase values
are exposed to the browser by design. Keep Apify and OpenAI keys server-only.
