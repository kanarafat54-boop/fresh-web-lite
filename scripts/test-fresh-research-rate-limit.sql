-- Run only in the disposable PostgreSQL service used by TRUEMODE CI.
do $$
begin
  if has_table_privilege('anon', 'fresh_internal.research_rate_limits', 'SELECT')
     or has_table_privilege('authenticated', 'fresh_internal.research_rate_limits', 'SELECT')
     or has_table_privilege('service_role', 'fresh_internal.research_rate_limits', 'SELECT') then
    raise exception 'Rate-limit storage must not be directly readable by API roles';
  end if;
  if has_function_privilege('anon', 'public.consume_fresh_research_rate_limit(text,integer,integer)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.consume_fresh_research_rate_limit(text,integer,integer)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.consume_fresh_research_rate_limit(text,integer,integer)', 'EXECUTE') then
    raise exception 'Rate-limit RPC privileges are not restricted to service_role';
  end if;
end;
$$;

set role service_role;
do $$
declare
  v record;
  i integer;
  v_key text := repeat('a', 64);
begin
  for i in 1..11 loop
    select * into v from public.consume_fresh_research_rate_limit(v_key, 10, 600);
    if i <= 10 and not v.allowed then
      raise exception 'Request % was unexpectedly blocked', i;
    end if;
    if i = 11 and v.allowed then
      raise exception 'Request 11 should be blocked by the 10-request limit';
    end if;
  end loop;

  select * into v from public.consume_fresh_research_rate_limit(repeat('b', 64), 10, 600);
  if not v.allowed then raise exception 'A separate client bucket was not independent'; end if;

  select * into v from public.consume_fresh_research_rate_limit(v_key, 10, 1);
  if v.allowed then
    -- The window may not have expired in this instant; test reset deterministically below.
    raise exception 'Existing window should remain blocked before its reset';
  end if;
end;
$$;
reset role;

-- Force an expired window and verify that the next request resets its counter.
update fresh_internal.research_rate_limits
set window_started_at = clock_timestamp() - interval '601 seconds'
where bucket_hash = repeat('a', 64);

set role service_role;
do $$
declare
  v record;
begin
  select * into v from public.consume_fresh_research_rate_limit(repeat('a', 64), 10, 600);
  if not v.allowed or v.remaining <> 9 then
    raise exception 'Expired rate-limit window did not reset correctly';
  end if;
end;
$$;
reset role;

select 'Fresh Research durable rate-limit integration: PASS' as result;
