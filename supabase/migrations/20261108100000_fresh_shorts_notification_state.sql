-- Fresh Shorts notifications: per-user read state, "clear" time and category preferences (spec 9.2, 3.11).
-- Additive only: one new table, owner-only row security. Until this is applied the app keeps the same state on
-- the device and tells the viewer so. Rollback: drop table public.short_notification_state.

create table if not exists public.short_notification_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  last_read_at timestamptz,
  cleared_before timestamptz,
  read_ids text[] not null default '{}',
  disabled_categories text[] not null default '{}',
  updated_at timestamptz not null default now(),
  constraint short_notification_state_read_ids_cap check (cardinality(read_ids) <= 300),
  constraint short_notification_state_categories_valid check (
    disabled_categories <@ array['reactions', 'comments', 'replies', 'mentions', 'followers', 'creator']::text[]
  )
);

alter table public.short_notification_state enable row level security;

do $$
begin
  create policy short_notification_state_select_own on public.short_notification_state
    for select to authenticated using ((select auth.uid()) = user_id);
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy short_notification_state_insert_own on public.short_notification_state
    for insert to authenticated with check ((select auth.uid()) = user_id);
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy short_notification_state_update_own on public.short_notification_state
    for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy short_notification_state_delete_own on public.short_notification_state
    for delete to authenticated using ((select auth.uid()) = user_id);
exception when duplicate_object then null;
end $$;

revoke all on public.short_notification_state from anon;
grant select, insert, update, delete on public.short_notification_state to authenticated;

notify pgrst, 'reload schema';
