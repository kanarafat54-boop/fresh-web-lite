-- Real push for Fresh Shorts: when someone likes, comments, replies or follows, a row lands in push_outbox and the
-- server sends it to the recipient's subscribed devices. Additive. No client can read or write the outbox.
--
-- A message is queued only when the recipient has a push subscription, has not switched that category off, has not
-- restricted the person, and does not have Quiet Mode on (the quiet window is stored in the person's local time, which
-- the server does not know, so Quiet Mode on means no push at all).

create table if not exists public.push_outbox (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('reactions', 'comments', 'replies', 'mentions', 'followers', 'creator')),
  title text not null check (char_length(title) <= 80),
  body text not null check (char_length(body) <= 200),
  url text not null default '/' check (url like '/%'),
  tag text,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  sent_at timestamptz,
  attempts integer not null default 0
);
create index if not exists push_outbox_pending_idx on public.push_outbox (id) where sent_at is null;
alter table public.push_outbox enable row level security;
revoke all on public.push_outbox from anon, authenticated;

create or replace function public.push_enqueue(p_recipient uuid, p_actor uuid, p_category text, p_title text, p_body text, p_url text, p_tag text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if p_recipient is null or p_recipient is not distinct from p_actor then return; end if;
  if not exists (select 1 from public.push_subscriptions where user_id = p_recipient) then return; end if;
  if p_actor is not null and exists (select 1 from public.user_restrictions where restrictor_id = p_recipient and restricted_id = p_actor) then return; end if;
  if exists (select 1 from public.short_privacy_settings where user_id = p_recipient and quiet_enabled) then return; end if;
  if exists (select 1 from public.short_notification_state where user_id = p_recipient and p_category = any (disabled_categories)) then return; end if;
  insert into public.push_outbox (user_id, category, title, body, url, tag) values (p_recipient, p_category, left(p_title, 80), left(p_body, 200), coalesce(p_url, '/'), p_tag);
exception when others then
  null; -- a notification problem must never block a like, comment or follow
end;
$$;
revoke all on function public.push_enqueue(uuid, uuid, text, text, text, text, text) from public, anon, authenticated;

create or replace function public.push_actor_name(p_actor uuid)
returns text language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(nullif(btrim(full_name), ''), nullif(btrim(username), ''), 'Someone') from public.users where id = p_actor
$$;
revoke all on function public.push_actor_name(uuid) from public, anon, authenticated;

create or replace function public.push_on_short_like() returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare owner uuid;
begin
  select author_id into owner from public.shorts where id = new.short_id;
  perform public.push_enqueue(owner, new.user_id, 'reactions', 'Fresh Shorts', coalesce(public.push_actor_name(new.user_id), 'Someone') || ' reacted to your Short', '/', 'like-' || new.short_id || '-' || new.user_id);
  return new;
exception when others then return new;
end;
$$;

create or replace function public.push_on_short_comment() returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare owner uuid; parent_author uuid; who text; snippet text;
begin
  if new.moderation_state is distinct from 'visible' then return new; end if;
  who := coalesce(public.push_actor_name(new.author_id), 'Someone');
  snippet := left(coalesce(nullif(btrim(new.content), ''), nullif(btrim(new.body), ''), ''), 120);
  if new.parent_id is not null then
    select author_id into parent_author from public.short_comments where id = new.parent_id;
    perform public.push_enqueue(parent_author, new.author_id, 'replies', 'Fresh Shorts', who || ' replied: ' || snippet, '/', 'reply-' || new.id);
  else
    select author_id into owner from public.shorts where id = new.short_id;
    perform public.push_enqueue(owner, new.author_id, 'comments', 'Fresh Shorts', who || ' commented: ' || snippet, '/', 'comment-' || new.id);
  end if;
  return new;
exception when others then return new;
end;
$$;

create or replace function public.push_on_follow() returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform public.push_enqueue(new.followed_id, new.follower_id, 'followers', 'Fresh Shorts', coalesce(public.push_actor_name(new.follower_id), 'Someone') || ' started following you', '/', 'follow-' || new.follower_id);
  return new;
exception when others then return new;
end;
$$;
revoke all on function public.push_on_short_like(), public.push_on_short_comment(), public.push_on_follow() from public, anon, authenticated;

drop trigger if exists push_short_like on public.short_likes;
create trigger push_short_like after insert on public.short_likes for each row execute function public.push_on_short_like();
drop trigger if exists push_short_comment on public.short_comments;
create trigger push_short_comment after insert on public.short_comments for each row execute function public.push_on_short_comment();
drop trigger if exists push_follow on public.follows;
create trigger push_follow after insert on public.follows for each row execute function public.push_on_follow();

-- Waking the sender. pg_net posts to the site with a shared secret that lives in Supabase Vault (never in this file).
-- Without the extension or the secret, nothing is sent and nothing else is affected.
create extension if not exists pg_net with schema extensions;

create or replace function public.push_kick() returns void language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare s text;
begin
  if not exists (select 1 from public.push_outbox where sent_at is null and attempts < 5) then return; end if;
  select decrypted_secret into s from vault.decrypted_secrets where name = 'fresh_push_secret' limit 1;
  if s is null then return; end if;
  perform net.http_post(url := 'https://fresh-web-lite.vercel.app/api/ai/ask?__fresh_push=1', headers := jsonb_build_object('content-type', 'application/json', 'x-fresh-push-secret', s), body := '{}'::jsonb);
exception when others then
  null;
end;
$$;
revoke all on function public.push_kick() from public, anon, authenticated;

create or replace function public.push_outbox_after_insert() returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform public.push_kick();
  return null;
end;
$$;
revoke all on function public.push_outbox_after_insert() from public, anon, authenticated;
drop trigger if exists push_outbox_kick on public.push_outbox;
create trigger push_outbox_kick after insert on public.push_outbox for each statement execute function public.push_outbox_after_insert();
