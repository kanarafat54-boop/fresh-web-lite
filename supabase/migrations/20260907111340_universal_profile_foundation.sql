-- Restored from production schema (20260907111340): universal profile foundation, second pass: RLS, policies and grants re-asserted
-- The original SQL for this version was never committed (placeholder). This file reconstructs the effective
-- end-state of the objects it introduced, from production catalogs read on 2026-10-23/24. Production has
-- already applied this version, so it will not re-run there. Everything below is idempotent.
-- Reconstruction note: statement-level history is not recoverable; final definitions are used.

alter table public.universal_profiles enable row level security;
alter table public.profile_links enable row level security;
alter table public.profile_portfolio_items enable row level security;
alter table public.profile_projects enable row level security;
alter table public.profile_privacy_settings enable row level security;

drop policy if exists "universal profiles owner write" on public.universal_profiles;
create policy "universal profiles owner write" on public.universal_profiles for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "universal profiles public read" on public.universal_profiles;
create policy "universal profiles public read" on public.universal_profiles for select to authenticated
  using (true);

drop policy if exists "profile owner delete" on public.profile_links;
create policy "profile owner delete" on public.profile_links for delete to public
  using (auth.uid() = user_id);

drop policy if exists "profile owner insert" on public.profile_links;
create policy "profile owner insert" on public.profile_links for insert to public
  with check (auth.uid() = user_id);

drop policy if exists "profile owner update" on public.profile_links;
create policy "profile owner update" on public.profile_links for update to public
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "profile public read" on public.profile_links;
create policy "profile public read" on public.profile_links for select to public
  using (true);

drop policy if exists "profile owner delete" on public.profile_portfolio_items;
create policy "profile owner delete" on public.profile_portfolio_items for delete to public
  using (auth.uid() = user_id);

drop policy if exists "profile owner insert" on public.profile_portfolio_items;
create policy "profile owner insert" on public.profile_portfolio_items for insert to public
  with check (auth.uid() = user_id);

drop policy if exists "profile owner update" on public.profile_portfolio_items;
create policy "profile owner update" on public.profile_portfolio_items for update to public
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "profile public read" on public.profile_portfolio_items;
create policy "profile public read" on public.profile_portfolio_items for select to public
  using (true);

drop policy if exists "profile owner delete" on public.profile_projects;
create policy "profile owner delete" on public.profile_projects for delete to public
  using (auth.uid() = user_id);

drop policy if exists "profile owner insert" on public.profile_projects;
create policy "profile owner insert" on public.profile_projects for insert to public
  with check (auth.uid() = user_id);

drop policy if exists "profile owner update" on public.profile_projects;
create policy "profile owner update" on public.profile_projects for update to public
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "profile public read" on public.profile_projects;
create policy "profile public read" on public.profile_projects for select to public
  using (true);

drop policy if exists "privacy settings owner insert" on public.profile_privacy_settings;
create policy "privacy settings owner insert" on public.profile_privacy_settings for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "privacy settings owner update" on public.profile_privacy_settings;
create policy "privacy settings owner update" on public.profile_privacy_settings for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "privacy settings public read" on public.profile_privacy_settings;
create policy "privacy settings public read" on public.profile_privacy_settings for select to authenticated
  using (true);
