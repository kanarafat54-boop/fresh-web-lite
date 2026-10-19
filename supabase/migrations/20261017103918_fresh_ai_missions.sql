-- Persistent storage for Fresh AI missions. The in-memory MissionManager resets
-- on every serverless cold start; missionStore.ts uses this table instead.

create table if not exists public.fresh_ai_missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  description text not null default '',
  goal text not null default '',
  status text not null default 'planned'
    check (status in ('planned', 'active', 'paused', 'completed', 'cancelled')),
  objectives jsonb not null default '[]'::jsonb,
  ecosystem text,
  power text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fresh_ai_missions_user_status_idx
  on public.fresh_ai_missions (user_id, status, updated_at desc);

create or replace function public.touch_fresh_ai_mission()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists touch_fresh_ai_mission on public.fresh_ai_missions;
create trigger touch_fresh_ai_mission
  before update on public.fresh_ai_missions
  for each row execute function public.touch_fresh_ai_mission();

alter table public.fresh_ai_missions enable row level security;

drop policy if exists "fresh_ai_missions_owner" on public.fresh_ai_missions;
create policy "fresh_ai_missions_owner" on public.fresh_ai_missions
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.fresh_ai_missions from anon;
grant select, insert, update, delete on public.fresh_ai_missions to authenticated;

notify pgrst, 'reload schema';
