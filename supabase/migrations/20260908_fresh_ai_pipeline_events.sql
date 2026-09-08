-- Fresh AI observable pipeline persistence
-- The canonical /api/ai/ask endpoint emits one event per governed pipeline stage.
-- Keep this table user-scoped so authenticated requests can persist without a service-role dependency.

create table if not exists public.fresh_ai_pipeline_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null,
  user_id uuid null references auth.users(id) on delete cascade,
  stage text not null check (stage in ('understand','memory','retrieve','research','reason','plan','coordinate','execute','verify','proof','feedback','improve','govern')),
  status text not null check (status in ('ready','completed','skipped','blocked','failed')),
  started_at timestamptz not null,
  completed_at timestamptz null,
  detail text null,
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists fresh_ai_pipeline_request_idx on public.fresh_ai_pipeline_events(request_id, created_at asc);
create index if not exists fresh_ai_pipeline_user_idx on public.fresh_ai_pipeline_events(user_id, created_at desc);

alter table public.fresh_ai_pipeline_events enable row level security;

drop policy if exists fresh_ai_pipeline_owner on public.fresh_ai_pipeline_events;
create policy fresh_ai_pipeline_owner on public.fresh_ai_pipeline_events
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
