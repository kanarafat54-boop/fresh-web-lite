-- Allow authenticated users to insert pipeline events only for their own
-- user id. Server-side service-role writes remain governed by service_role.
drop policy if exists fresh_ai_pipeline_events_insert_own
  on public.fresh_ai_pipeline_events;
create policy fresh_ai_pipeline_events_insert_own
  on public.fresh_ai_pipeline_events
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
