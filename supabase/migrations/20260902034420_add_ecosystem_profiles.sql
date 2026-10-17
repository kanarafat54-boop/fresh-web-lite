-- Restore the ecosystem profile foundation for clean local migration replay.
-- Reconstructed from the live catalog; this migration is repository-only.
create table if not exists public.ecosystem_profiles (
  id uuid primary key default gen_random_uuid(),
  fresh_id uuid not null references public.users(id) on delete cascade,
  ecosystem_id text not null,
  title text not null default '',
  description text not null default '',
  enabled boolean not null default true,
  level integer not null default 0,
  feed_modes text[] not null default array['for-you', 'social', 'learn', 'relax', 'others']::text[],
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ecosystem_profiles_feed_modes_check
    check (feed_modes <@ array['for-you', 'social', 'learn', 'relax', 'others']::text[]),
  constraint ecosystem_profiles_fresh_ecosystem_unique
    unique (fresh_id, ecosystem_id)
);

create index if not exists ecosystem_profiles_ecosystem_id_idx
  on public.ecosystem_profiles (ecosystem_id);
create index if not exists ecosystem_profiles_fresh_id_idx
  on public.ecosystem_profiles (fresh_id);

alter table public.ecosystem_profiles enable row level security;

drop policy if exists "ecosystem profiles are publicly readable when enabled"
  on public.ecosystem_profiles;
create policy "ecosystem profiles are publicly readable when enabled"
  on public.ecosystem_profiles
  for select to public
  using (enabled = true or auth.uid() = fresh_id);

grant select on public.ecosystem_profiles to anon, authenticated;

notify pgrst, 'reload schema';
