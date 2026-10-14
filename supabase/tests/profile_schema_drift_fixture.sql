create table public.ecosystem_profiles (
  id uuid primary key default gen_random_uuid(),
  fresh_id uuid not null,
  ecosystem_id text not null,
  feed_modes text[] not null default array[]::text[],
  constraint ecosystem_profiles_feed_modes_check
    check (feed_modes <@ array['for-you','social','learn','relax','others']::text[]),
  constraint ecosystem_profiles_fresh_ecosystem_unique unique (fresh_id, ecosystem_id)
);
