-- Durable, privacy-preserving quotas for the public Fresh Research endpoint.
-- Raw IP addresses are never persisted. The application sends an HMAC-SHA256 identifier.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.fresh_research_rate_limits (
  identifier_hash text primary key
    check (identifier_hash ~ '^[0-9a-f]{64}$'),
  minute_started_at timestamptz not null,
  minute_count integer not null default 0 check (minute_count >= 0),
  hour_started_at timestamptz not null,
  hour_count integer not null default 0 check (hour_count >= 0),
  day_started_at timestamptz not null,
  day_count integer not null default 0 check (day_count >= 0),
  updated_at timestamptz not null default now()
);

create index fresh_research_rate_limits_updated_at_idx
  on private.fresh_research_rate_limits (updated_at);

revoke all on table private.fresh_research_rate_limits from public, anon, authenticated, service_role;

create or replace function public.consume_fresh_research_quota(p_identifier_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := statement_timestamp();
  v_minute_start timestamptz := date_trunc('minute', statement_timestamp());
  v_hour_start timestamptz := date_trunc('hour', statement_timestamp());
  v_day_start timestamptz := date_trunc('day', statement_timestamp());
  v_minute_count integer;
  v_hour_count integer;
  v_day_count integer;
  v_retry_after integer := 0;
begin
  if p_identifier_hash is null or p_identifier_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid research quota identifier' using errcode = '22023';
  end if;

  insert into private.fresh_research_rate_limits (
    identifier_hash, minute_started_at, minute_count,
    hour_started_at, hour_count, day_started_at, day_count, updated_at
  ) values (
    p_identifier_hash, v_minute_start, 1,
    v_hour_start, 1, v_day_start, 1, v_now
  )
  on conflict (identifier_hash) do update set
    minute_started_at = case
      when private.fresh_research_rate_limits.minute_started_at < excluded.minute_started_at
      then excluded.minute_started_at else private.fresh_research_rate_limits.minute_started_at end,
    minute_count = case
      when private.fresh_research_rate_limits.minute_started_at < excluded.minute_started_at
      then 1 else private.fresh_research_rate_limits.minute_count + 1 end,
    hour_started_at = case
      when private.fresh_research_rate_limits.hour_started_at < excluded.hour_started_at
      then excluded.hour_started_at else private.fresh_research_rate_limits.hour_started_at end,
    hour_count = case
      when private.fresh_research_rate_limits.hour_started_at < excluded.hour_started_at
      then 1 else private.fresh_research_rate_limits.hour_count + 1 end,
    day_started_at = case
      when private.fresh_research_rate_limits.day_started_at < excluded.day_started_at
      then excluded.day_started_at else private.fresh_research_rate_limits.day_started_at end,
    day_count = case
      when private.fresh_research_rate_limits.day_started_at < excluded.day_started_at
      then 1 else private.fresh_research_rate_limits.day_count + 1 end,
    updated_at = excluded.updated_at
  returning minute_count, hour_count, day_count
  into v_minute_count, v_hour_count, v_day_count;

  if v_minute_count > 6 then
    v_retry_after := greatest(1, ceil(extract(epoch from (v_minute_start + interval '1 minute' - v_now))::numeric)::integer);
  elsif v_hour_count > 30 then
    v_retry_after := greatest(1, ceil(extract(epoch from (v_hour_start + interval '1 hour' - v_now))::numeric)::integer);
  elsif v_day_count > 100 then
    v_retry_after := greatest(1, ceil(extract(epoch from (v_day_start + interval '1 day' - v_now))::numeric)::integer);
  end if;

  -- Opportunistically prune a bounded batch of inactive identifiers.
  if random() < 0.01 then
    delete from private.fresh_research_rate_limits
    where ctid in (
      select ctid
      from private.fresh_research_rate_limits
      where updated_at < v_now - interval '2 days'
      order by updated_at
      limit 500
    );
  end if;

  return jsonb_build_object(
    'allowed', v_minute_count <= 6 and v_hour_count <= 30 and v_day_count <= 100,
    'remaining', greatest(0, least(6 - v_minute_count, 30 - v_hour_count, 100 - v_day_count)),
    'retryAfterSeconds', v_retry_after,
    'limits', jsonb_build_object('perMinute', 6, 'perHour', 30, 'perDay', 100)
  );
end;
$$;

revoke all on function public.consume_fresh_research_quota(text) from public, anon, authenticated;
grant execute on function public.consume_fresh_research_quota(text) to service_role;
