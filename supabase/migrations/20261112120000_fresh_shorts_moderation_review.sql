-- Fresh Shorts moderation: reviewer queue, decisions, and appeals (spec 10.2, 10.3).
--
--   * A reviewer is a platform admin (users.role = 'admin'; that column is server-managed). The owner decides who.
--   * review_queue / decide_report: reviewers see reports with a preview of the content and act on them. Content is
--     never deleted: a Short is set to 'hidden' (still visible to its creator and to reviewers), a comment to
--     'hidden' or 'removed' (the existing comment states). Every decision is written to an append-only log.
--   * submit_appeal / appeal_queue / decide_appeal: the creator of hidden content can appeal once per decision; a
--     reviewer upholds or overturns it, and overturning restores the content.
--
-- Additive, with one tightening: the public read policy on shorts now hides Shorts whose moderation_state is
-- 'hidden' from everyone except their creator and reviewers. Every existing Short is 'visible'.
-- Server roles (service_role, SQL) bypass these checks as they do everywhere.

create or replace function public.is_platform_reviewer()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.users where id = auth.uid() and role = 'admin') $$;
revoke all on function public.is_platform_reviewer() from public, anon;
grant execute on function public.is_platform_reviewer() to anon, authenticated;

alter table public.shorts add column if not exists moderation_state text not null default 'visible';
alter table public.shorts add column if not exists moderation_reason text;
alter table public.shorts add column if not exists moderated_at timestamptz;
do $$ begin
  alter table public.shorts add constraint shorts_moderation_state_check check (moderation_state in ('visible', 'hidden'));
exception when duplicate_object then null; end $$;

drop policy if exists "Shorts are viewable by everyone" on public.shorts;
drop policy if exists shorts_visible on public.shorts;
create policy shorts_visible on public.shorts for select
  using (moderation_state = 'visible' or author_id = (select auth.uid()) or public.is_platform_reviewer());

-- Append-only log of every moderation decision.
create table if not exists public.short_moderation_decisions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.reports (id) on delete set null,
  target_type text not null check (target_type in ('short', 'short_comment')),
  target_id uuid not null,
  decision text not null check (decision in ('dismissed', 'hidden', 'removed', 'restored')),
  reason text check (reason is null or char_length(reason) <= 500),
  decided_by uuid not null,
  decided_at timestamptz not null default now()
);
create index if not exists short_moderation_decisions_target_idx on public.short_moderation_decisions (target_type, target_id, decided_at desc);

create or replace function public.short_moderation_refuse_change()
returns trigger language plpgsql set search_path = public
as $$ begin raise exception 'moderation decisions are append-only'; end; $$;
revoke all on function public.short_moderation_refuse_change() from public, anon, authenticated;
drop trigger if exists short_moderation_no_update on public.short_moderation_decisions;
create trigger short_moderation_no_update before update on public.short_moderation_decisions for each row execute function public.short_moderation_refuse_change();
drop trigger if exists short_moderation_no_delete on public.short_moderation_decisions;
create trigger short_moderation_no_delete before delete on public.short_moderation_decisions for each row execute function public.short_moderation_refuse_change();

alter table public.short_moderation_decisions enable row level security;
revoke all on public.short_moderation_decisions from anon, authenticated;
grant select on public.short_moderation_decisions to authenticated;
drop policy if exists short_moderation_decisions_reviewers on public.short_moderation_decisions;
create policy short_moderation_decisions_reviewers on public.short_moderation_decisions for select to authenticated using (public.is_platform_reviewer());

create table if not exists public.short_appeals (
  id uuid primary key default gen_random_uuid(),
  appellant_id uuid not null references auth.users (id) on delete cascade,
  target_type text not null check (target_type in ('short', 'short_comment')),
  target_id uuid not null,
  decision_id uuid not null references public.short_moderation_decisions (id),
  message text not null check (char_length(btrim(message)) between 10 and 1000),
  status text not null default 'open' check (status in ('open', 'upheld', 'overturned')),
  reviewer_id uuid,
  reviewer_note text check (reviewer_note is null or char_length(reviewer_note) <= 500),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  unique (decision_id, appellant_id)
);
create index if not exists short_appeals_status_idx on public.short_appeals (status, created_at);
alter table public.short_appeals enable row level security;
revoke all on public.short_appeals from anon, authenticated;
grant select on public.short_appeals to authenticated;
drop policy if exists short_appeals_own_or_reviewer on public.short_appeals;
create policy short_appeals_own_or_reviewer on public.short_appeals for select to authenticated
  using (appellant_id = (select auth.uid()) or public.is_platform_reviewer());

create or replace function public.moderation_require_reviewer()
returns void language plpgsql stable security definer set search_path = public
as $$ begin
  if auth.uid() is null or not public.is_platform_reviewer() then
    raise exception 'Only reviewers can do this.' using errcode = '42501';
  end if;
end; $$;
revoke all on function public.moderation_require_reviewer() from public, anon, authenticated;

create or replace function public.review_queue(p_status text default 'open', p_limit integer default 50)
returns table (report_id uuid, target_type text, target_id uuid, reason text, details text, status text, created_at timestamptz,
               report_count bigint, target_author_id uuid, preview text, target_state text)
language plpgsql stable security definer set search_path = public
as $$
begin
  perform public.moderation_require_reviewer();
  if p_status not in ('open', 'reviewing', 'actioned', 'dismissed') then raise exception 'Unknown status.' using errcode = '22023'; end if;
  return query
  select r.id, r.target_type, r.target_id, r.reason, r.details, r.status, r.created_at,
    (select count(*) from public.reports x where x.target_type = r.target_type and x.target_id = r.target_id),
    case r.target_type when 'short' then (select s.author_id from public.shorts s where s.id = r.target_id)
                       when 'short_comment' then (select c.author_id from public.short_comments c where c.id = r.target_id) end,
    case r.target_type when 'short' then (select left(coalesce(s.caption, ''), 200) from public.shorts s where s.id = r.target_id)
                       when 'short_comment' then (select left(coalesce(c.content, ''), 200) from public.short_comments c where c.id = r.target_id) end,
    case r.target_type when 'short' then (select s.moderation_state from public.shorts s where s.id = r.target_id)
                       when 'short_comment' then (select c.moderation_state from public.short_comments c where c.id = r.target_id) end
  from public.reports r
  where r.status = p_status
  order by r.created_at asc
  limit least(greatest(coalesce(p_limit, 50), 1), 200);
end; $$;
revoke all on function public.review_queue(text, integer) from public, anon;
grant execute on function public.review_queue(text, integer) to authenticated;

create or replace function public.decide_report(p_report_id uuid, p_decision text, p_reason text)
returns void language plpgsql security definer set search_path = public
as $$
declare r public.reports%rowtype; why text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  perform public.moderation_require_reviewer();
  if p_decision not in ('dismissed', 'hidden', 'removed') then raise exception 'Unknown decision.' using errcode = '22023'; end if;
  select * into r from public.reports where id = p_report_id;
  if not found then raise exception 'Report not found.' using errcode = 'P0002'; end if;
  if p_decision <> 'dismissed' and (why is null or char_length(why) < 3 or char_length(why) > 500) then
    raise exception 'Give a reason of 3 to 500 characters.' using errcode = '22023';
  end if;
  if why is not null and char_length(why) > 500 then raise exception 'Give a reason of 3 to 500 characters.' using errcode = '22023'; end if;

  if p_decision = 'dismissed' then
    update public.reports set status = 'dismissed' where id = r.id;
    if r.target_type in ('short', 'short_comment') then
      insert into public.short_moderation_decisions (report_id, target_type, target_id, decision, reason, decided_by)
        values (r.id, r.target_type, r.target_id, 'dismissed', why, auth.uid());
    end if;
    return;
  end if;

  if r.target_type = 'short_comment' then
    update public.short_comments set moderation_state = case when p_decision = 'removed' then 'removed' else 'hidden' end,
      moderation_reason = why, moderated_at = now() where id = r.target_id;
  elsif r.target_type = 'short' then
    update public.shorts set moderation_state = 'hidden', moderation_reason = why, moderated_at = now() where id = r.target_id;
  else
    raise exception 'Only Shorts and comments can be actioned here.' using errcode = '22023';
  end if;
  if not found then raise exception 'The reported content no longer exists.' using errcode = 'P0002'; end if;

  update public.reports set status = 'actioned' where target_type = r.target_type and target_id = r.target_id and status in ('open', 'reviewing');
  insert into public.short_moderation_decisions (report_id, target_type, target_id, decision, reason, decided_by)
    values (r.id, r.target_type, r.target_id, p_decision, why, auth.uid());
end; $$;
revoke all on function public.decide_report(uuid, text, text) from public, anon;
grant execute on function public.decide_report(uuid, text, text) to authenticated;

create or replace function public.submit_appeal(p_target_type text, p_target_id uuid, p_message text)
returns uuid language plpgsql security definer set search_path = public
as $$
declare owner uuid; state text; dec uuid; new_id uuid; msg text := btrim(coalesce(p_message, ''));
begin
  if auth.uid() is null then raise exception 'Sign in to appeal.' using errcode = '28000'; end if;
  if char_length(msg) < 10 or char_length(msg) > 1000 then raise exception 'Explain your appeal in 10 to 1000 characters.' using errcode = '22023'; end if;
  if p_target_type = 'short' then
    select author_id, moderation_state into owner, state from public.shorts where id = p_target_id;
  elsif p_target_type = 'short_comment' then
    select author_id, moderation_state into owner, state from public.short_comments where id = p_target_id;
  else
    raise exception 'Only Shorts and comments can be appealed.' using errcode = '22023';
  end if;
  if owner is null or owner <> auth.uid() then raise exception 'You can only appeal decisions about your own content.' using errcode = '42501'; end if;
  if state in ('visible', 'approved', 'pending') then raise exception 'There is no decision to appeal.' using errcode = '22023'; end if;
  select id into dec from public.short_moderation_decisions
    where target_type = p_target_type and target_id = p_target_id and decision in ('hidden', 'removed')
    order by decided_at desc limit 1;
  if dec is null then raise exception 'There is no decision to appeal.' using errcode = '22023'; end if;
  insert into public.short_appeals (appellant_id, target_type, target_id, decision_id, message)
    values (auth.uid(), p_target_type, p_target_id, dec, msg) returning id into new_id;
  return new_id;
exception when unique_violation then
  raise exception 'You already appealed this decision.' using errcode = '23505';
end; $$;
revoke all on function public.submit_appeal(text, uuid, text) from public, anon;
grant execute on function public.submit_appeal(text, uuid, text) to authenticated;

create or replace function public.appeal_queue(p_status text default 'open', p_limit integer default 50)
returns table (appeal_id uuid, target_type text, target_id uuid, message text, status text, created_at timestamptz,
               decision text, decision_reason text, preview text)
language plpgsql stable security definer set search_path = public
as $$
begin
  perform public.moderation_require_reviewer();
  if p_status not in ('open', 'upheld', 'overturned') then raise exception 'Unknown status.' using errcode = '22023'; end if;
  return query
  select a.id, a.target_type, a.target_id, a.message, a.status, a.created_at, d.decision, d.reason,
    case a.target_type when 'short' then (select left(coalesce(s.caption, ''), 200) from public.shorts s where s.id = a.target_id)
                       when 'short_comment' then (select left(coalesce(c.content, ''), 200) from public.short_comments c where c.id = a.target_id) end
  from public.short_appeals a join public.short_moderation_decisions d on d.id = a.decision_id
  where a.status = p_status order by a.created_at asc
  limit least(greatest(coalesce(p_limit, 50), 1), 200);
end; $$;
revoke all on function public.appeal_queue(text, integer) from public, anon;
grant execute on function public.appeal_queue(text, integer) to authenticated;

create or replace function public.decide_appeal(p_appeal_id uuid, p_overturn boolean, p_note text)
returns void language plpgsql security definer set search_path = public
as $$
declare a public.short_appeals%rowtype; note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  perform public.moderation_require_reviewer();
  if note is null or char_length(note) < 3 or char_length(note) > 500 then raise exception 'Give a note of 3 to 500 characters.' using errcode = '22023'; end if;
  select * into a from public.short_appeals where id = p_appeal_id for update;
  if not found then raise exception 'Appeal not found.' using errcode = 'P0002'; end if;
  if a.status <> 'open' then raise exception 'This appeal was already decided.' using errcode = '22023'; end if;

  if p_overturn then
    if a.target_type = 'short_comment' then
      update public.short_comments set moderation_state = 'visible', moderation_reason = null, moderated_at = now() where id = a.target_id;
    else
      update public.shorts set moderation_state = 'visible', moderation_reason = null, moderated_at = now() where id = a.target_id;
    end if;
    insert into public.short_moderation_decisions (target_type, target_id, decision, reason, decided_by)
      values (a.target_type, a.target_id, 'restored', note, auth.uid());
  end if;
  update public.short_appeals set status = case when p_overturn then 'overturned' else 'upheld' end,
    reviewer_id = auth.uid(), reviewer_note = note, decided_at = now() where id = a.id;
end; $$;
revoke all on function public.decide_appeal(uuid, boolean, text) from public, anon;
grant execute on function public.decide_appeal(uuid, boolean, text) to authenticated;

notify pgrst, 'reload schema';
