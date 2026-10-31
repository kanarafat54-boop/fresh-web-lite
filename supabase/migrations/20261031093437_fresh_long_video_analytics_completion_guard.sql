-- Keep the last few seconds of a watch session from being counted twice,
-- while still recording the completion event when pause and ended fire together.
create index if not exists fresh_long_video_analytics_viewer_recent_idx
  on private.fresh_long_video_analytics_sessions (viewer_id, started_at desc);

create or replace function public.record_fresh_long_video_watch(
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

revoke all on function public.record_fresh_long_video_watch(uuid, uuid, numeric, numeric, numeric, boolean) from public, anon;
grant execute on function public.record_fresh_long_video_watch(uuid, uuid, numeric, numeric, numeric, boolean) to authenticated;
