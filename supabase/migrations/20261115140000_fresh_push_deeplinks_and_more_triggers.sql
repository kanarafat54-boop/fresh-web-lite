-- Push follow-up. Additive; replaces functions from 20261115120000 and adds triggers.
-- 1. Likes, comments and replies now link to the Short (/?short=<id>) so tapping a notification opens it.
-- 2. Mentions (@username in a comment), reposts, remixes/duets and gifts also queue a push.
--    Reposts, remixes and gifts use the "creator" category, as the in-app feed does.

create or replace function public.push_on_short_like() returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare owner uuid;
begin
  select author_id into owner from public.shorts where id = new.short_id;
  perform public.push_enqueue(owner, new.user_id, 'reactions', 'Fresh Shorts', coalesce(public.push_actor_name(new.user_id), 'Someone') || ' reacted to your Short', '/?short=' || new.short_id, 'like-' || new.short_id || '-' || new.user_id);
  return new;
exception when others then return new;
end;
$$;

create or replace function public.push_on_short_comment() returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare owner uuid; parent_author uuid; who text; snippet text; link text; handle text; mentioned uuid; already uuid[] := '{}';
begin
  if new.moderation_state is distinct from 'visible' then return new; end if;
  who := coalesce(public.push_actor_name(new.author_id), 'Someone');
  snippet := left(coalesce(nullif(btrim(new.content), ''), nullif(btrim(new.body), ''), ''), 120);
  link := '/?short=' || new.short_id;
  if new.parent_id is not null then
    select author_id into parent_author from public.short_comments where id = new.parent_id;
    perform public.push_enqueue(parent_author, new.author_id, 'replies', 'Fresh Shorts', who || ' replied: ' || snippet, link, 'reply-' || new.id);
    already := already || parent_author;
  else
    select author_id into owner from public.shorts where id = new.short_id;
    perform public.push_enqueue(owner, new.author_id, 'comments', 'Fresh Shorts', who || ' commented: ' || snippet, link, 'comment-' || new.id);
    already := already || owner;
  end if;
  -- Mentions: at most three people per comment, and nobody who was just told about this comment another way.
  for handle in select distinct lower(m[1]) from regexp_matches(coalesce(new.content, '') || ' ' || coalesce(new.body, ''), '(?:^|[^A-Za-z0-9_])@([A-Za-z0-9_.]{2,30})', 'g') as m limit 3 loop
    select id into mentioned from public.users where lower(username) = handle limit 1;
    if mentioned is not null and not (mentioned = any (already)) then
      perform public.push_enqueue(mentioned, new.author_id, 'mentions', 'Fresh Shorts', who || ' mentioned you: ' || snippet, link, 'mention-' || new.id || '-' || mentioned);
      already := already || mentioned;
    end if;
  end loop;
  return new;
exception when others then return new;
end;
$$;

create or replace function public.push_on_short_repost() returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare owner uuid;
begin
  select author_id into owner from public.shorts where id = new.short_id;
  perform public.push_enqueue(owner, new.user_id, 'creator', 'Fresh Shorts', coalesce(public.push_actor_name(new.user_id), 'Someone') || ' reposted your Short', '/?short=' || new.short_id, 'repost-' || new.short_id || '-' || new.user_id);
  return new;
exception when others then return new;
end;
$$;

create or replace function public.push_on_short_remix() returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare source_id uuid; owner uuid; verb text;
begin
  source_id := coalesce(new.remix_of_short_id, new.duet_of_short_id);
  if source_id is null then return new; end if;
  verb := case when new.remix_of_short_id is not null then 'remixed' else 'made a duet with' end;
  select author_id into owner from public.shorts where id = source_id;
  perform public.push_enqueue(owner, new.author_id, 'creator', 'Fresh Shorts', coalesce(public.push_actor_name(new.author_id), 'Someone') || ' ' || verb || ' your Short', '/?short=' || new.id, 'remix-' || new.id);
  return new;
exception when others then return new;
end;
$$;

create or replace function public.push_on_short_gift() returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform public.push_enqueue(new.recipient_id, new.sender_id, 'creator', 'Fresh Shorts', coalesce(public.push_actor_name(new.sender_id), 'Someone') || ' sent you a gift', '/?short=' || new.short_id, 'gift-' || new.id);
  return new;
exception when others then return new;
end;
$$;
revoke all on function public.push_on_short_like(), public.push_on_short_comment(), public.push_on_short_repost(), public.push_on_short_remix(), public.push_on_short_gift() from public, anon, authenticated;

drop trigger if exists push_short_repost on public.short_reposts;
create trigger push_short_repost after insert on public.short_reposts for each row execute function public.push_on_short_repost();
drop trigger if exists push_short_remix on public.shorts;
create trigger push_short_remix after insert on public.shorts for each row when (new.remix_of_short_id is not null or new.duet_of_short_id is not null) execute function public.push_on_short_remix();
drop trigger if exists push_short_gift on public.short_gifts;
create trigger push_short_gift after insert on public.short_gifts for each row execute function public.push_on_short_gift();
