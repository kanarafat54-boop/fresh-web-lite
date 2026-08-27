-- Universal interaction persistence foundation.
-- Keeps existing Posts/Shorts tables intact while giving every eligible Fresh
-- object a shared interaction state/event boundary.

create table if not exists public.universal_interactions (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null,
  target_id uuid not null,
  interaction_type text not null,
  interaction_value text,
  parent_id uuid references public.universal_interactions(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint universal_interactions_target_type_check check (
    target_type in (
      'short','video','post','text','image','gallery','audio','podcast','live',
      'news','article','story','poll','comment','reply','quote','remix','duet',
      'learning','knowledge','marketplace','profile','ar','vr','mixed'
    )
  ),
  constraint universal_interactions_type_check check (
    interaction_type in (
      'react','comment','reply','save','share','repost','quote','vote',
      'remix','duet','collaborate','follow'
    )
  )
);

create unique index if not exists universal_interactions_actor_target_action_uidx
  on public.universal_interactions(actor_id, target_type, target_id, interaction_type);

create index if not exists universal_interactions_target_idx
  on public.universal_interactions(target_type, target_id, created_at desc);

create index if not exists universal_interactions_actor_idx
  on public.universal_interactions(actor_id, created_at desc);

create index if not exists universal_interactions_parent_idx
  on public.universal_interactions(parent_id);

alter table public.universal_interactions enable row level security;

drop policy if exists universal_interactions_select on public.universal_interactions;
create policy universal_interactions_select
  on public.universal_interactions for select
  using (true);

drop policy if exists universal_interactions_insert on public.universal_interactions;
create policy universal_interactions_insert
  on public.universal_interactions for insert
  with check (auth.uid() = actor_id);

drop policy if exists universal_interactions_update on public.universal_interactions;
create policy universal_interactions_update
  on public.universal_interactions for update
  using (auth.uid() = actor_id)
  with check (auth.uid() = actor_id);

drop policy if exists universal_interactions_delete on public.universal_interactions;
create policy universal_interactions_delete
  on public.universal_interactions for delete
  using (auth.uid() = actor_id);

-- Keep updated_at accurate without relying on application clients.
create or replace function public.set_universal_interaction_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists universal_interactions_set_updated_at
  on public.universal_interactions;
create trigger universal_interactions_set_updated_at
before update on public.universal_interactions
for each row execute function public.set_universal_interaction_updated_at();

-- Reactions and poll votes remain separate interaction types. A poll may
-- therefore have one reaction and one vote from the same actor without
-- conflating the two actions.
