-- Run only against the disposable PostgreSQL service in TRUEMODE CI.
do $test$
declare
  result jsonb;
  i integer;
begin
  for i in 1..6 loop
    result := public.consume_fresh_research_quota(repeat('a', 64));
    if result->>'allowed' <> 'true' then
      raise exception 'Request % should be allowed by the minute quota: %', i, result;
    end if;
  end loop;

  result := public.consume_fresh_research_quota(repeat('a', 64));
  if result->>'allowed' <> 'false' or (result->>'retryAfterSeconds')::integer < 1 then
    raise exception 'Seventh request should be blocked with retry guidance: %', result;
  end if;

  result := public.consume_fresh_research_quota(repeat('b', 64));
  if result->>'allowed' <> 'true' then
    raise exception 'A separate identifier should have an independent quota: %', result;
  end if;

  if has_table_privilege('anon', 'private.fresh_research_rate_limits', 'SELECT')
     or has_table_privilege('authenticated', 'private.fresh_research_rate_limits', 'SELECT')
     or has_table_privilege('service_role', 'private.fresh_research_rate_limits', 'SELECT') then
    raise exception 'Rate-limit storage must not be directly readable by API roles';
  end if;

  if has_function_privilege('anon', 'public.consume_fresh_research_quota(text)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.consume_fresh_research_quota(text)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.consume_fresh_research_quota(text)', 'EXECUTE') then
    raise exception 'Quota RPC must be executable only by service_role';
  end if;

  raise notice 'Fresh Research quota integration: PASS (atomic quota, retry-after, identity isolation, least-privilege grants)';
end
$test$;
