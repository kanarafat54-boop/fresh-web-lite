-- Reconstructed from the live production schema to make the tracked
-- migration history reproducible from an empty database. The old migration
-- file was only a history marker even though the table is used by Fresh AI.
create table if not exists public.fresh_ai_pipeline_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null,
  user_id uuid null references auth.users(id) on delete set null,
  stage text not null,
  status text not null,
  started_at timestamptz not null,
  completed_at timestamptz null,
  detail text null,
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists fresh_ai_pipeline_events_request_id_idx
  on public.fresh_ai_pipeline_events (request_id);
create index if not exists fresh_ai_pipeline_events_created_at_idx
  on public.fresh_ai_pipeline_events (created_at desc);

alter table public.fresh_ai_pipeline_events enable row level security;

drop policy if exists fresh_ai_pipeline_events_select_own
  on public.fresh_ai_pipeline_events;
create policy fresh_ai_pipeline_events_select_own
  on public.fresh_ai_pipeline_events
  for select to authenticated
  using ((select auth.uid()) = user_id);
