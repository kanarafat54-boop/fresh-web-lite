-- Fresh user safety: Block (spec 10.4).
--
-- A block is private to the blocker: only they can see, add or remove their own rows, so the blocked account
-- is not told. Enforcement in the database, so it does not depend on the app being up to date:
--   * a blocked account cannot comment on, or reply to, content by the person who blocked them;
--   * a blocked account cannot follow the person who blocked them;
--   * blocking removes follows between the two accounts, in both directions.
-- The app also hides blocked accounts' Shorts, comments and activity from the blocker.
-- Not enforced here: a blocked account can still view the blocker's public Shorts, as it could when signed out.
-- Additive: one new table, three trigger functions. Apply after schema review.
-- Rollback: drop the three triggers, the functions, then the table.

create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_not_self check (blocker_id <> blocked_id)
);

create index if not exists user_blocks_blocked_idx on public.user_blocks (blocked_id);

alter table public.user_blocks enable row level security;

do $$
begin
  create policy user_blocks_select_own on public.user_blocks
    for select to authenticated using ((select auth.uid()) = blocker_id);
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy user_blocks_insert_own on public.user_blocks
    for insert to authenticated with check ((select auth.uid()) = blocker_id);
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy user_blocks_delete_own on public.user_blocks
    for delete to authenticated using ((select auth.uid()) = blocker_id);
exception when duplicate_object then null;
end $$;

revoke all on public.user_blocks from anon;
grant select, insert, delete on public.user_blocks to authenticated;

-- Used only by the trigger functions below, which run as their owner so the blocked account never needs to read
-- the blocker's rows (and so cannot discover a block).
create or replace function public.has_blocked(blocker uuid, target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_blocks where blocker_id = blocker and blocked_id = target);
$$;

revoke all on function public.has_blocked(uuid, uuid) from public, anon, authenticated;

create or replace function public.guard_short_comment_blocks()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  short_author uuid;
  parent_author uuid;
begin
  select author_id into short_author from public.shorts where id = new.short_id;
  if short_author is not null and public.has_blocked(short_author, new.author_id) then
    raise exception 'You can''t comment on this Short.' using errcode = '42501';
  end if;
  if new.parent_id is not null then
    select author_id into parent_author from public.short_comments where id = new.parent_id;
    if parent_author is not null and public.has_blocked(parent_author, new.author_id) then
      raise exception 'You can''t reply to this comment.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.guard_short_comment_blocks() from public, anon, authenticated;

create or replace function public.guard_follow_blocks()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.has_blocked(new.followed_id, new.follower_id) then
    raise exception 'You can''t follow this account.' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.guard_follow_blocks() from public, anon, authenticated;

create or replace function public.remove_follows_on_block()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.follows
  where (follower_id = new.blocked_id and followed_id = new.blocker_id)
     or (follower_id = new.blocker_id and followed_id = new.blocked_id);
  return new;
end;
$$;

revoke all on function public.remove_follows_on_block() from public, anon, authenticated;

drop trigger if exists guard_short_comment_blocks on public.short_comments;
create trigger guard_short_comment_blocks
  before insert on public.short_comments
  for each row execute function public.guard_short_comment_blocks();

drop trigger if exists guard_follow_blocks on public.follows;
create trigger guard_follow_blocks
  before insert on public.follows
  for each row execute function public.guard_follow_blocks();

drop trigger if exists remove_follows_on_block on public.user_blocks;
create trigger remove_follows_on_block
  after insert on public.user_blocks
  for each row execute function public.remove_follows_on_block();

notify pgrst, 'reload schema';
