-- Align the allowed ecosystem feed modes with the Fresh Flow defaults.
-- ensure_default_ecosystem_profiles() intentionally seeds the "fresh-picks" mode;
-- the previous constraint rejected that row and caused the RPC to fail at signup.

alter table public.ecosystem_profiles
  drop constraint if exists ecosystem_profiles_feed_modes_check;

alter table public.ecosystem_profiles
  add constraint ecosystem_profiles_feed_modes_check
  check (
    feed_modes <@ array['for-you', 'social', 'learn', 'relax', 'others', 'fresh-picks']::text[]
  );
