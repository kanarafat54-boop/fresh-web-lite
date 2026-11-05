-- Fresh Studio Audience Lens: aggregate-only viewing totals for a creator's own Short.
-- Additive: one new function. No table, policy or data is changed. fresh_flow_events stays owner-only;
-- this function never returns viewer ids, session ids or individual rows.
-- NOT applied to the live project until the owner authorizes it.

create or replace function public.fresh_short_audience_lens(p_short_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_viewers int;
  v_result jsonb;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  select author_id into v_owner from public.shorts where id = p_short_id;
  if v_owner is null or v_owner <> v_uid then
    raise exception 'not the owner of this short' using errcode = '42501';
  end if;

  select count(distinct actor_id) into v_viewers
  from public.fresh_flow_events
  where media_id = p_short_id and event_type in ('play_start','play_25','play_50','play_75','complete');

  -- Small groups could identify one person, so totals are withheld under 5 viewers.
  if v_viewers < 5 then
    return jsonb_build_object('enough', false, 'viewers', v_viewers, 'minViewers', 5);
  end if;

  select jsonb_build_object(
    'enough', true,
    'viewers', v_viewers,
    'minViewers', 5,
    'start', count(distinct actor_id) filter (where event_type = 'play_start'),
    'q25', count(distinct actor_id) filter (where event_type = 'play_25'),
    'q50', count(distinct actor_id) filter (where event_type = 'play_50'),
    'q75', count(distinct actor_id) filter (where event_type = 'play_75'),
    'complete', count(distinct actor_id) filter (where event_type = 'complete'),
    'skips', count(distinct actor_id) filter (where event_type = 'skip')
  ) into v_result
  from public.fresh_flow_events
  where media_id = p_short_id;
  return v_result;
end;
$$;

revoke all on function public.fresh_short_audience_lens(uuid) from public, anon;
grant execute on function public.fresh_short_audience_lens(uuid) to authenticated;
