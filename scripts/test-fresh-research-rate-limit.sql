-- Run only in the disposable PostgreSQL service used by TRUEMODE CI.
do $$
begin
  if has_table_privilege('anon', 'private.fresh_research_rate_limits', 'SELECT')
     or has_table_privilege('authenticated', 'private.fresh_research_rate_limits', 'SELECT')
     or has_table_privilege('service_role', 'private.fresh_research_rate_limits', 'SELECT') then
    raise exception 'Rate-limit storage must not be directly readable by API roles';
  end if;
  if has_function_privilege('anon', 'public.consume_fresh_research_quota(text)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.consume_fresh_research_quota(text)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.consume_fresh_research_quota(text)', 'EXECUTE') then
    raise exception 'Research quota RPC privileges are not restricted to service_role';
  end if;
end;
$$;

set role service_role;
do $$
declare
  v jsonb;
  i integer;
  v_key text := repeat('a', 64);
begin
  for i in 1..7 loop
    v := public.consume_fresh_research_quota(v_key);
    if i <= 6 and not (v->>'allowed')::boolean then
      raise exception 'Minute quota unexpectedly blocked request %', i;
    end if;
    if i = 7 and (v->>'allowed')::boolean then
      raise exception 'Request 7 should be blocked by the 6-per-minute quota';
    end if;
  end loop;
  if coalesce((v->>'retryAfterSeconds')::integer, 0) < 1 then
    raise exception 'Blocked minute quota must return a positive retry delay';
  end if;

  v := public.consume_fresh_research_quota(repeat('b', 64));
  if not (v->>'allowed')::boolean then
    raise exception 'A separate client identifier should have an independent quota';
  end if;
end;
$$;
reset role;

-- Exercise the hourly quota independently of the minute quota.
update private.fresh_research_rate_limits
set minute_started_at = date_trunc('minute', clock_timestamp()) - interval '1 minute',
    minute_count = 0,
    hour_started_at = date_trunc('hour', clock_timestamp()),
    hour_count = 30,
    day_started_at = date_trunc('day', clock_timestamp()),
    day_count = 1
where identifier_hash = repeat('a', 64);

set role service_role;
do $$
declare v jsonb;
begin
  v := public.consume_fresh_research_quota(repeat('a', 64));
  if (v->>'allowed')::boolean or coalesce((v->>'retryAfterSeconds')::integer, 0) < 1 then
    raise exception 'Hourly quota was not enforced independently';
  end if;
end;
$$;
reset role;

-- Exercise the daily quota independently of minute and hour windows.
update private.fresh_research_rate_limits
set minute_started_at = date_trunc('minute', clock_timestamp()) - interval '1 minute',
    minute_count = 0,
    hour_started_at = date_trunc('hour', clock_timestamp()) - interval '1 hour',
    hour_count = 0,
    day_started_at = date_trunc('day', clock_timestamp()),
    day_count = 100
where identifier_hash = repeat('a', 64);

set role service_role;
do $$
declare v jsonb;
begin
  v := public.consume_fresh_research_quota(repeat('a', 64));
  if (v->>'allowed')::boolean or coalesce((v->>'retryAfterSeconds')::integer, 0) < 1 then
    raise exception 'Daily quota was not enforced independently';
  end if;
end;
$$;
reset role;

-- Force all windows to expire and verify the next request resets all counters.
update private.fresh_research_rate_limits
set minute_started_at = date_trunc('minute', clock_timestamp()) - interval '2 minutes',
    minute_count = 50,
    hour_started_at = date_trunc('hour', clock_timestamp()) - interval '2 hours',
    hour_count = 50,
    day_started_at = date_trunc('day', clock_timestamp()) - interval '2 days',
    day_count = 200
where identifier_hash = repeat('a', 64);

set role service_role;
do $$
declare v jsonb;
begin
  v := public.consume_fresh_research_quota(repeat('a', 64));
  if not (v->>'allowed')::boolean or (v->>'remaining')::integer <> 5 then
    raise exception 'Expired quota windows did not reset correctly';
  end if;
end;
$$;
reset role;

select 'Fresh Research multi-window quota integration: PASS' as result;
