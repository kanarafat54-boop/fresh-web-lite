-- Fresh Shorts privacy and safety controls (spec 3.10, 10.4, 10.5).
--
--   * short_privacy_settings: per-user comment, message and sound-reuse settings plus Quiet Mode.
--   * user_restrictions: Restrict, a quieter step than Block. A restricted account can still comment, but those
--     comments are held and only the commenter and the Short's creator can see them until the creator approves.
--   * Comment controls enforced in the database: who may comment (everyone / people I follow / nobody), per-Short
--     override, hold-for-approval, keyword hold. Held comments are hidden from everyone but the commenter and creator.
--   * Block coverage extended to likes, reposts, interactions on Shorts and direct messages.
--   * who_can_message enforced for direct messages.
--
-- Additive except one tightening: the public read policy on short_comments now hides rows in state 'pending' from
-- everyone except their author and the Short's creator. No existing comment is 'pending' today.
-- Server roles (auth.uid() is null) are never restricted by these triggers.

create or replace function public.short_keywords_valid(p_keywords text[])
returns boolean language sql immutable
as $$
  select coalesce(cardinality(p_keywords), 0) <= 50
     and not exists (select 1 from unnest(p_keywords) k where char_length(btrim(k)) not between 1 and 40)
$$;

create table if not exists public.short_privacy_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  who_can_comment text not null default 'everyone' check (who_can_comment in ('everyone', 'following', 'nobody')),
  hold_comments boolean not null default false,
  comment_keywords text[] not null default '{}',
  who_can_message text not null default 'everyone' check (who_can_message in ('everyone', 'following', 'nobody')),
  sound_reuse_allowed boolean not null default true,
  quiet_enabled boolean not null default false,
  quiet_from time,
  quiet_until time,
  daily_limit_minutes integer check (daily_limit_minutes is null or daily_limit_minutes between 5 and 720),
  updated_at timestamptz not null default now(),
  constraint short_privacy_keywords_cap check (public.short_keywords_valid(comment_keywords))
);
alter table public.short_privacy_settings enable row level security;
do $$ begin create policy short_privacy_select_own on public.short_privacy_settings for select to authenticated using ((select auth.uid()) = user_id); exception when duplicate_object then null; end $$;
do $$ begin create policy short_privacy_insert_own on public.short_privacy_settings for insert to authenticated with check ((select auth.uid()) = user_id); exception when duplicate_object then null; end $$;
do $$ begin create policy short_privacy_update_own on public.short_privacy_settings for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id); exception when duplicate_object then null; end $$;
revoke all on public.short_privacy_settings from anon;
grant select, insert, update on public.short_privacy_settings to authenticated;

-- Whether others may reuse this creator's sound is public information the Sound page needs.
create or replace function public.short_sound_reuse_allowed(p_creator uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce((select sound_reuse_allowed from public.short_privacy_settings where user_id = p_creator), true) $$;
revoke all on function public.short_sound_reuse_allowed(uuid) from public;
grant execute on function public.short_sound_reuse_allowed(uuid) to anon, authenticated;

create table if not exists public.user_restrictions (
  restrictor_id uuid not null references auth.users (id) on delete cascade,
  restricted_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (restrictor_id, restricted_id),
  constraint user_restrictions_not_self check (restrictor_id <> restricted_id)
);
create index if not exists user_restrictions_restricted_idx on public.user_restrictions (restricted_id);
alter table public.user_restrictions enable row level security;
do $$ begin create policy user_restrictions_select_own on public.user_restrictions for select to authenticated using ((select auth.uid()) = restrictor_id); exception when duplicate_object then null; end $$;
do $$ begin create policy user_restrictions_insert_own on public.user_restrictions for insert to authenticated with check ((select auth.uid()) = restrictor_id); exception when duplicate_object then null; end $$;
do $$ begin create policy user_restrictions_delete_own on public.user_restrictions for delete to authenticated using ((select auth.uid()) = restrictor_id); exception when duplicate_object then null; end $$;
revoke all on public.user_restrictions from anon;
grant select, insert, delete on public.user_restrictions to authenticated;

-- Per-Short comment mode. NULL means "use the creator's default".
alter table public.shorts add column if not exists comments_mode text;
do $$ begin
  alter table public.shorts add constraint shorts_comments_mode_check check (comments_mode is null or comments_mode in ('everyone', 'following', 'nobody'));
exception when duplicate_object then null; end $$;

create or replace function public.set_short_comments_mode(p_short_id uuid, p_mode text)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Sign in to change comment settings' using errcode = '28000'; end if;
  if p_mode is not null and p_mode not in ('everyone', 'following', 'nobody') then raise exception 'Unknown comment mode' using errcode = '22023'; end if;
  update public.shorts set comments_mode = p_mode where id = p_short_id and author_id = auth.uid();
  if not found then raise exception 'Only the creator of this Short can change its comment settings' using errcode = '42501'; end if;
end;
$$;
revoke all on function public.set_short_comments_mode(uuid, text) from public, anon;
grant execute on function public.set_short_comments_mode(uuid, text) to authenticated;

create or replace function public.has_restricted(restrictor uuid, target uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_restrictions where restrictor_id = restrictor and restricted_id = target) $$;
revoke all on function public.has_restricted(uuid, uuid) from public, anon, authenticated;

-- Comment controls. Runs after guard_short_comment_blocks (triggers fire in name order).
create or replace function public.short_comment_controls()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  s record;
  cfg record;
  mode text;
  kw text;
  held boolean := false;
begin
  if auth.uid() is null then return new; end if;
  select author_id, comments_mode into s from public.shorts where id = new.short_id;
  if s.author_id is null or s.author_id = new.author_id then return new; end if;

  select * into cfg from public.short_privacy_settings where user_id = s.author_id;
  mode := coalesce(s.comments_mode, cfg.who_can_comment, 'everyone');
  if mode = 'nobody' then
    raise exception 'Comments are turned off for this Short.' using errcode = '42501';
  end if;
  if mode = 'following' and not exists (select 1 from public.follows where follower_id = s.author_id and followed_id = new.author_id) then
    raise exception 'Only people the creator follows can comment on this Short.' using errcode = '42501';
  end if;

  if public.has_restricted(s.author_id, new.author_id) then held := true; end if;
  if coalesce(cfg.hold_comments, false) then held := true; end if;
  if not held and cfg.comment_keywords is not null and coalesce(new.content, '') <> '' then
    foreach kw in array cfg.comment_keywords loop
      if position(lower(btrim(kw)) in lower(new.content)) > 0 then held := true; exit; end if;
    end loop;
  end if;
  if held then
    new.moderation_state := 'pending';
    new.moderation_reason := 'held_for_review';
  end if;
  return new;
end;
$$;
revoke all on function public.short_comment_controls() from public, anon, authenticated;
drop trigger if exists short_comment_controls on public.short_comments;
create trigger short_comment_controls before insert on public.short_comments
  for each row execute function public.short_comment_controls();

-- Held comments are visible only to their author and the Short's creator.
drop policy if exists "Short comments viewable by everyone" on public.short_comments;
drop policy if exists short_comments_visible on public.short_comments;
create policy short_comments_visible on public.short_comments for select using (
  moderation_state is distinct from 'pending'
  or author_id = (select auth.uid())
  or exists (select 1 from public.shorts s where s.id = short_id and s.author_id = (select auth.uid()))
);

-- The creator approves or removes a held comment. Nobody can edit another person's words.
create or replace function public.review_held_comment(p_comment_id uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = public
as $$
declare v_short uuid;
begin
  if auth.uid() is null then raise exception 'Sign in to review comments' using errcode = '28000'; end if;
  select short_id into v_short from public.short_comments where id = p_comment_id and moderation_state = 'pending';
  if v_short is null then raise exception 'No held comment found' using errcode = 'P0002'; end if;
  if not exists (select 1 from public.shorts s where s.id = v_short and s.author_id = auth.uid()) then
    raise exception 'Only the creator of this Short can review held comments' using errcode = '42501';
  end if;
  update public.short_comments
     set moderation_state = case when p_approve then 'approved' else 'removed' end,
         moderation_reason = case when p_approve then null else 'removed_by_creator' end,
         moderated_at = now()
   where id = p_comment_id;
end;
$$;
revoke all on function public.review_held_comment(uuid, boolean) from public, anon;
grant execute on function public.review_held_comment(uuid, boolean) to authenticated;

-- Block coverage beyond comments and follows.
create or replace function public.guard_short_interaction_blocks()
returns trigger language plpgsql security definer set search_path = public
as $$
declare actor uuid; short_author uuid; target uuid;
begin
  if auth.uid() is null then return new; end if;
  if tg_table_name = 'universal_interactions' then
    if new.target_type is distinct from 'short' then return new; end if;
    actor := new.actor_id; target := new.target_id;
  else
    actor := new.user_id; target := new.short_id;
  end if;
  select author_id into short_author from public.shorts where id = target;
  if short_author is not null and public.has_blocked(short_author, actor) then
    raise exception 'You can''t interact with this Short.' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_short_interaction_blocks() from public, anon, authenticated;
drop trigger if exists guard_short_likes_blocks on public.short_likes;
create trigger guard_short_likes_blocks before insert on public.short_likes for each row execute function public.guard_short_interaction_blocks();
drop trigger if exists guard_short_reposts_blocks on public.short_reposts;
create trigger guard_short_reposts_blocks before insert on public.short_reposts for each row execute function public.guard_short_interaction_blocks();
drop trigger if exists guard_universal_interaction_blocks on public.universal_interactions;
create trigger guard_universal_interaction_blocks before insert on public.universal_interactions for each row execute function public.guard_short_interaction_blocks();

-- Direct messages: blocks and who_can_message.
create or replace function public.guard_direct_message_controls()
returns trigger language plpgsql security definer set search_path = public
as $$
declare who text;
begin
  if auth.uid() is null then return new; end if;
  if public.has_blocked(new.recipient_id, new.sender_id) then
    raise exception 'You can''t message this account.' using errcode = '42501';
  end if;
  select who_can_message into who from public.short_privacy_settings where user_id = new.recipient_id;
  if who = 'nobody' then
    raise exception 'This account is not accepting messages.' using errcode = '42501';
  end if;
  if who = 'following' and not exists (select 1 from public.follows where follower_id = new.recipient_id and followed_id = new.sender_id) then
    raise exception 'This account only accepts messages from people it follows.' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_direct_message_controls() from public, anon, authenticated;
drop trigger if exists guard_direct_message_controls on public.direct_messages;
create trigger guard_direct_message_controls before insert on public.direct_messages for each row execute function public.guard_direct_message_controls();

-- Search coverage for Block: of the given accounts, returns those that have NOT blocked the signed-in viewer.
-- The viewer only learns that an account is missing from results, never that it blocked them.
create or replace function public.visible_author_ids(p_ids uuid[])
returns setof uuid language sql stable security definer set search_path = public
as $$
  select i from unnest(coalesce(p_ids, '{}'::uuid[])) as i
  where auth.uid() is null or not public.has_blocked(i, auth.uid())
$$;
revoke all on function public.visible_author_ids(uuid[]) from public;
grant execute on function public.visible_author_ids(uuid[]) to anon, authenticated;

notify pgrst, 'reload schema';
