-- Allow authenticated Fresh AI requests to persist their own pipeline telemetry through RLS.
-- The existing table was already provisioned in production; this migration adds the missing INSERT policy.

drop policy if exists fresh_ai_pipeline_events_insert_own on public.fresh_ai_pipeline_events;
create policy fresh_ai_pipeline_events_insert_own on public.fresh_ai_pipeline_events
  for insert
  with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
