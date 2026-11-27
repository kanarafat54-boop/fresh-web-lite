-- Fresh Shorts: shared collections.
-- Additive only: one new table with its own RLS. No existing table, policy or data is changed.
-- NOT applied to the live project until the owner authorizes it.
--
-- Rollback: drop table if exists public.fresh_short_collection_members;

create table if not exists public.fresh_short_collection_members (
  collection_id uuid not null references public.fresh_short_collections(id) on delete cascade,
  member_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('viewer', 'contributor')),
  invited_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (collection_id, member_id)
);
create index if not exists fresh_short_collection_members_member_idx on public.fresh_short_collection_members (member_id);

alter table public.fresh_short_collection_members enable row level security;
revoke all on public.fresh_short_collection_members from anon, authenticated;
grant select, insert, update, delete on public.fresh_short_collection_members to authenticated;

-- The policies below look across collections and members. Reading one table from the other's policy would
-- recurse, so the cross-table checks live in two small security-definer helpers that bypass RLS.
create or replace function public.fresh_is_collection_owner(p_collection_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp
as $$ select exists (select 1 from public.fresh_short_collections c where c.id = p_collection_id and c.user_id = auth.uid()); $$;
create or replace function public.fresh_is_collection_member(p_collection_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp
as $$ select exists (select 1 from public.fresh_short_collection_members m where m.collection_id = p_collection_id and m.member_id = auth.uid()); $$;
revoke all on function public.fresh_is_collection_owner(uuid), public.fresh_is_collection_member(uuid) from public, anon;
grant execute on function public.fresh_is_collection_owner(uuid), public.fresh_is_collection_member(uuid) to authenticated;

-- A member sees their own membership; the collection owner sees and manages all members.
create policy fresh_short_collection_members_read on public.fresh_short_collection_members
  for select to authenticated using (member_id = (select auth.uid()) or public.fresh_is_collection_owner(collection_id));
create policy fresh_short_collection_members_owner_write on public.fresh_short_collection_members
  for all to authenticated
  using (public.fresh_is_collection_owner(collection_id))
  with check (invited_by = (select auth.uid()) and public.fresh_is_collection_owner(collection_id));
-- A member may leave a collection.
create policy fresh_short_collection_members_leave on public.fresh_short_collection_members
  for delete to authenticated using (member_id = (select auth.uid()));

-- Members can read the collection and its items (in addition to the existing public/owner rules).
create policy fresh_short_collections_member_read on public.fresh_short_collections
  for select to authenticated using (public.fresh_is_collection_member(id));
create policy fresh_short_collection_items_member_read on public.fresh_short_collection_items
  for select to authenticated using (public.fresh_is_collection_member(collection_id));
