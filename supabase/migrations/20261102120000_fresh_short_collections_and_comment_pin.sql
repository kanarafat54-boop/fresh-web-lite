-- Fresh Shorts: collections / playlists, and creator-pinned comments.
-- Additive only. No existing table, policy or data is changed except one new nullable column.
-- NOT applied to the live project until the owner authorizes it.

-- 1. Collections (private saves grouping) and playlists (public creator groupings) share one structure.
create table if not exists public.fresh_short_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'collection' check (kind in ('collection', 'playlist')),
  title text not null check (char_length(btrim(title)) between 1 and 80),
  description text check (description is null or char_length(description) <= 500),
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A playlist is a public showcase; a private playlist makes no sense, a public "collection" is allowed.
  constraint fresh_short_collections_playlist_public check (kind <> 'playlist' or visibility = 'public')
);
create index if not exists fresh_short_collections_user_idx on public.fresh_short_collections (user_id, kind, created_at desc);

create table if not exists public.fresh_short_collection_items (
  collection_id uuid not null references public.fresh_short_collections(id) on delete cascade,
  short_id uuid not null references public.shorts(id) on delete cascade,
  position integer not null default 0,
  added_at timestamptz not null default now(),
  primary key (collection_id, short_id)
);
create index if not exists fresh_short_collection_items_short_idx on public.fresh_short_collection_items (short_id);

alter table public.fresh_short_collections enable row level security;
alter table public.fresh_short_collection_items enable row level security;

revoke all on public.fresh_short_collections, public.fresh_short_collection_items from anon, authenticated;
grant select on public.fresh_short_collections, public.fresh_short_collection_items to anon, authenticated;
grant insert, update, delete on public.fresh_short_collections, public.fresh_short_collection_items to authenticated;

create policy fresh_short_collections_read on public.fresh_short_collections
  for select using (visibility = 'public' or (select auth.uid()) = user_id);
create policy fresh_short_collections_insert on public.fresh_short_collections
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy fresh_short_collections_update on public.fresh_short_collections
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy fresh_short_collections_delete on public.fresh_short_collections
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy fresh_short_collection_items_read on public.fresh_short_collection_items
  for select using (exists (
    select 1 from public.fresh_short_collections c
    where c.id = collection_id and (c.visibility = 'public' or c.user_id = (select auth.uid()))
  ));
create policy fresh_short_collection_items_write on public.fresh_short_collection_items
  for all to authenticated
  using (exists (select 1 from public.fresh_short_collections c where c.id = collection_id and c.user_id = (select auth.uid())))
  with check (exists (select 1 from public.fresh_short_collections c where c.id = collection_id and c.user_id = (select auth.uid())));

-- 2. Pinned comments. Only the Short's creator may pin, and only through this function.
alter table public.short_comments add column if not exists pinned_at timestamptz;

create or replace function public.pin_short_comment(p_comment_id uuid, p_pinned boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_short uuid;
  v_parent uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in to pin comments' using errcode = '28000';
  end if;
  select c.short_id, c.parent_id into v_short, v_parent from public.short_comments c where c.id = p_comment_id;
  if v_short is null then
    raise exception 'Comment not found' using errcode = 'P0002';
  end if;
  if v_parent is not null then
    raise exception 'Only top-level comments can be pinned' using errcode = '22023';
  end if;
  if not exists (select 1 from public.shorts s where s.id = v_short and s.author_id = auth.uid()) then
    raise exception 'Only the creator of this Short can pin comments' using errcode = '42501';
  end if;
  if p_pinned then
    -- One pinned comment per Short.
    update public.short_comments set pinned_at = null where short_id = v_short and pinned_at is not null;
    update public.short_comments set pinned_at = now() where id = p_comment_id;
  else
    update public.short_comments set pinned_at = null where id = p_comment_id;
  end if;
end;
$$;
revoke all on function public.pin_short_comment(uuid, boolean) from public, anon;
grant execute on function public.pin_short_comment(uuid, boolean) to authenticated;
