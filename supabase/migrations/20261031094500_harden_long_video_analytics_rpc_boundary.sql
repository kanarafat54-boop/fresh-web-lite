-- Keep privileged viewer-session access behind the non-exposed private schema.
-- Public RPC entrypoints are SECURITY INVOKER wrappers with authenticated-only grants.
grant usage on schema private to authenticated;

create or replace function private.record_fresh_long_video_watch(
  p_post_id uuid,
  p_session_id uuid,
  p_watch_seconds numeric,
  p_max_position_seconds numeric,
  p_duration_seconds numeric default null,
  p_completed boolean default false
)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_viewer_id uuid := auth.uid();
  v_creator_id uuid;
  v_duration numeric(12,3);
  v_watch numeric(12,3);
  v_position numeric(12,3);
begin
  if v_viewer_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_post_id is null or p_session_id is null then
    raise exception 'A video and playback session are required' using errcode = '22023';
  end if;
  if p_watch_seconds is null or p_watch_seconds < 0 or p_watch_seconds > 30 then
    raise exception 'Watch-time increment must be between 0 and 30 seconds' using errcode = '22023';
  end if;
  if p_max_position_seconds is null or p_max_position_seconds < 0 then
    raise exception 'Playback position is invalid' using errcode = '22023';
  end if;
  v_watch := round(p_watch_seconds, 3);
  v_duration := case when p_duration_seconds > 0 then least(round(p_duration_seconds, 3), 86400) else null end;
  v_position := least(round(p_max_position_seconds, 3), coalesce(v_duration, 86400));

  select p.author_id into v_creator_id
  from public.posts p
  where p.id = p_post_id
    and p.video_url is not null
    and p.video_status = 'published'
    and p.video_visibility in ('public', 'unlisted')
    and (p.video_scheduled_at is null or p.video_scheduled_at <= now());

  if v_creator_id is null or v_creator_id = v_viewer_id then
    return;
  end if;

  insert into private.fresh_long_video_analytics_sessions (
    post_id, creator_id, viewer_id, session_id, watched_seconds,
    max_position_seconds, duration_seconds, completed_at
  ) values (
    p_post_id, v_creator_id, v_viewer_id, p_session_id, v_watch,
    v_position, v_duration, case when p_completed then now() else null end
  )
  on conflict (post_id, viewer_id, session_id) do update
  set watched_seconds = least(
        private.fresh_long_video_analytics_sessions.watched_seconds
        + case when private.fresh_long_video_analytics_sessions.last_seen_at <= now() - interval '5 seconds' then excluded.watched_seconds else 0 end,
        86400
      ),
      max_position_seconds = greatest(private.fresh_long_video_analytics_sessions.max_position_seconds, excluded.max_position_seconds),
      duration_seconds = coalesce(excluded.duration_seconds, private.fresh_long_video_analytics_sessions.duration_seconds),
      last_seen_at = case
        when private.fresh_long_video_analytics_sessions.last_seen_at <= now() - interval '5 seconds' then now()
        else private.fresh_long_video_analytics_sessions.last_seen_at
      end,
      completed_at = coalesce(private.fresh_long_video_analytics_sessions.completed_at, excluded.completed_at)
  where private.fresh_long_video_analytics_sessions.last_seen_at <= now() - interval '5 seconds'
     or (p_completed and private.fresh_long_video_analytics_sessions.completed_at is null);
end;
$$;

create or replace function private.get_fresh_long_video_analytics(p_days integer default 28)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_creator_id uuid := auth.uid();
  v_days integer := greatest(7, least(coalesce(p_days, 28), 90));
  v_result jsonb;
begin
  if v_creator_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  with scoped as (
    select s.*
    from private.fresh_long_video_analytics_sessions s
    join public.posts p on p.id = s.post_id and p.author_id = v_creator_id and p.video_url is not null
    where s.creator_id = v_creator_id
      and s.started_at >= now() - make_interval(days => v_days)
  ),
  qualified as (
    select * from scoped where watched_seconds >= 2
  ),
  totals as (
    select
      count(*)::bigint as qualified_sessions,
      count(distinct viewer_id)::bigint as unique_viewers,
      coalesce(sum(watched_seconds), 0)::numeric(14,2) as watch_seconds,
      count(*) filter (where completed_at is not null)::bigint as completed_sessions,
      coalesce(avg(watched_seconds), 0)::numeric(14,2) as average_watch_seconds
    from qualified
  ),
  per_video as (
    select
      q.post_id,
      coalesce(nullif(btrim(p.video_title), ''), nullif(btrim(p.content), ''), 'Untitled video') as title,
      count(*)::bigint as views,
      count(distinct q.viewer_id)::bigint as unique_viewers,
      coalesce(sum(q.watched_seconds), 0)::numeric(14,2) as watch_seconds,
      count(*) filter (where q.completed_at is not null)::bigint as completed_sessions
    from qualified q
    join public.posts p on p.id = q.post_id
    group by q.post_id, p.video_title, p.content
    order by count(*) desc, sum(q.watched_seconds) desc
    limit 20
  )
  select jsonb_build_object(
    'days', v_days,
    'views', t.qualified_sessions,
    'qualified_sessions', t.qualified_sessions,
    'unique_viewers', t.unique_viewers,
    'watch_seconds', t.watch_seconds,
    'watch_hours', round(t.watch_seconds / 3600, 2),
    'average_watch_seconds', t.average_watch_seconds,
    'completed_sessions', t.completed_sessions,
    'completion_rate', case when t.qualified_sessions > 0 then round((t.completed_sessions::numeric / t.qualified_sessions) * 100, 1) else 0 end,
    'videos', coalesce((select jsonb_agg(to_jsonb(pv)) from per_video pv), '[]'::jsonb)
  ) into v_result
  from totals t;

  return coalesce(v_result, '{}'::jsonb);
end;
$$;

revoke all on function private.record_fresh_long_video_watch(uuid, uuid, numeric, numeric, numeric, boolean) from public, anon;
revoke all on function private.get_fresh_long_video_analytics(integer) from public, anon;
grant execute on function private.record_fresh_long_video_watch(uuid, uuid, numeric, numeric, numeric, boolean) to authenticated;
grant execute on function private.get_fresh_long_video_analytics(integer) to authenticated;

create or replace function public.record_fresh_long_video_watch(
  p_post_id uuid,
  p_session_id uuid,
  p_watch_seconds numeric,
  p_max_position_seconds numeric,
  p_duration_seconds numeric default null,
  p_completed boolean default false
)
returns void
language sql
security invoker
set search_path = pg_catalog
as $$
  select private.record_fresh_long_video_watch($1, $2, $3, $4, $5, $6);
$$;

create or replace function public.get_fresh_long_video_analytics(p_days integer default 28)
returns jsonb
language sql
security invoker
set search_path = pg_catalog
as $$
  select private.get_fresh_long_video_analytics($1);
$$;

revoke all on function public.record_fresh_long_video_watch(uuid, uuid, numeric, numeric, numeric, boolean) from public, anon;
revoke all on function public.get_fresh_long_video_analytics(integer) from public, anon;
grant execute on function public.record_fresh_long_video_watch(uuid, uuid, numeric, numeric, numeric, boolean) to authenticated;
grant execute on function public.get_fresh_long_video_analytics(integer) to authenticated;
