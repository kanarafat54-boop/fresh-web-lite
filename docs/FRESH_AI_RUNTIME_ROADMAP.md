# Fresh AI Runtime Roadmap

## Completed in this layer

1. **Canonical backend** — `/api/ai/ask` is the primary Fresh AI request boundary for the unified UI.
2. **Persistence hardening** — server persistence now uses one environment resolver, reports configuration failures instead of silently dropping pipeline events, and supports the newer `SUPABASE_SECRET_KEY` with legacy `SUPABASE_SERVICE_ROLE_KEY` fallback.
3. **Everywhere surface** — `FreshAIUnified` is mounted once at the application shell and derives workspace context from the active Fresh route.
4. **One UI** — duplicate `GlobalFreshAI`, `FreshAIMain`, and `FreshAIContextPanel` mounts were removed from `AppShell`; the unified surface handles global opening and the `/ai` full experience.
5. **Real image generation** — Fresh AI `Create` requests that explicitly target images are routed through the OpenAI Images API from the server. The API key never enters browser code.
6. **Verification** — `npm run test:fresh-ai` checks the canonical backend, persistence, provider, and single-UI contract.

## Required deployment environment

Production server environment must contain:

- `SUPABASE_URL` (preferred server-side URL)
- `SUPABASE_SECRET_KEY` (preferred new Supabase server key) **or** `SUPABASE_SERVICE_ROLE_KEY` for the legacy setup
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` for request authentication compatibility
- `GEMINI_API_KEY` or `GOOGLE_GENERATIVE_AI_API_KEY` for the current answer/interpretation provider
- `OPENAI_API_KEY` for real image generation
- optional `FRESH_IMAGE_MODEL` (defaults to `gpt-image-2`)

On Vercel, server secrets must be assigned to the environment that actually serves production requests. Never expose `SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, or `OPENAI_API_KEY` through `VITE_*` variables.

## Next integration sequence

- Add richer image edit/variation flows behind the same `/api/ai/ask` capability boundary.
- Persist generated media into Fresh-owned storage/library instead of returning only an inline data URL.
- Expand route-aware context adapters for Fresh Flow, Messages, Profile, Wallet, Academy, Creator Studio, Developer and Workspace.
- Add voice/realtime providers behind the same capability resolver.
- Add provider/model routing so Fresh AI can choose the best available provider per capability.
- Keep verification, truth decisions, permissions and approval boundaries between planning and execution.
- Retire legacy AI UI/components only after all imports and event producers are migrated.
