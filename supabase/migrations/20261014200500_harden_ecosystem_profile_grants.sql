-- Phase 0: tighten browser grants on ecosystem_profiles while preserving
-- public reads for enabled profiles and owner-managed profile creation/updates.

revoke all privileges on table public.ecosystem_profiles from public, anon, authenticated;

-- Enabled ecosystem profiles are intentionally publicly discoverable.
grant select on table public.ecosystem_profiles to anon;
grant select, insert, update on table public.ecosystem_profiles to authenticated;

-- Keep one canonical owner policy per operation; the old "users can ..."
-- policies duplicate the newer ecosystem_profiles_* owner policies.
drop policy if exists "users can create their ecosystem profiles" on public.ecosystem_profiles;
drop policy if exists "users can update their ecosystem profiles" on public.ecosystem_profiles;
drop policy if exists "users can delete their ecosystem profiles" on public.ecosystem_profiles;

notify pgrst, 'reload schema';
