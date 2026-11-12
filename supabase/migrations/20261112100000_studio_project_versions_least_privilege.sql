-- Version snapshots are immutable: signed-in users may read, add and delete their own, nothing else.
-- Supabase's default privileges also grant UPDATE, TRUNCATE, TRIGGER and REFERENCES on new public tables;
-- RLS already blocks UPDATE (no policy), but TRUNCATE is not covered by RLS, so remove what is not needed.
-- Applied to production on 2026-11-12 through the Supabase MCP.
revoke update, truncate, trigger, references on public.studio_project_versions from authenticated;
revoke all on public.studio_project_versions from anon;
