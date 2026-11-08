-- FALC v1 worker scheduling: atomic claims, leases, bounded retries.
-- All RPCs are service-role only; user-facing clients cannot create or transition objectives.

alter table public.fresh_ai_learning_objectives
  add column if not exists lease_token uuid,
  add column if not exists lease_expires_at timestamptz,
  add column if not exists last_error_code text;

create index if not exists fresh_ai_learning_objectives_lease_idx
  on public.fresh_ai_learning_objectives (lease_expires_at)
  where status = 'running';

create or replace function public.fresh_ai_claim_learning_objectives(
  p_now timestamptz default now(),
  p_limit integer default 5,
  p_lease_seconds integer default 300
)
returns setof public.fresh_ai_learning_objectives
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if p_limit < 1 or p_limit > 25 or p_lease_seconds < 30 or p_lease_seconds > 900 then
    raise exception 'invalid_worker_bounds' using errcode = '22023';
  end if;

  return query
  with due as (
    select o.id
    from public.fresh_ai_learning_objectives o
    where o.attempts < 20
      and (
        (o.status = 'queued' and o.due_at <= p_now)
        or (o.status = 'running' and o.lease_expires_at <= p_now)
      )
    order by o.due_at asc, o.created_at asc
    for update skip locked
    limit p_limit
  )
  update public.fresh_ai_learning_objectives o
  set status = 'running',
      attempts = o.attempts + 1,
      lease_token = gen_random_uuid(),
      lease_expires_at = p_now + make_interval(secs => p_lease_seconds),
      updated_at = p_now
  from due
  where o.id = due.id
  returning o.*;
end;
$$;

create or replace function public.fresh_ai_complete_learning_objective(
  p_objective_id uuid,
  p_lease_token uuid,
  p_result_reference text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare changed integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if p_result_reference is null or char_length(btrim(p_result_reference)) not between 1 and 512
     or p_result_reference ~* '^https?://' then
    raise exception 'invalid_result_reference' using errcode = '22023';
  end if;
  update public.fresh_ai_learning_objectives
  set status = 'completed',
      result_reference = p_result_reference,
      lease_token = null,
      lease_expires_at = null,
      last_error_code = null,
      updated_at = now()
  where id = p_objective_id and status = 'running' and lease_token = p_lease_token;
  get diagnostics changed = row_count;
  return changed = 1;
end;
$$;

create or replace function public.fresh_ai_fail_learning_objective(
  p_objective_id uuid,
  p_lease_token uuid,
  p_reason_code text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare changed integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if p_reason_code is null or p_reason_code !~ '^[a-z0-9][a-z0-9_-]{0,63}$' then
    raise exception 'invalid_failure_code' using errcode = '22023';
  end if;
  update public.fresh_ai_learning_objectives
  set status = case when attempts >= 5 then 'failed' else 'queued' end,
      due_at = case when attempts >= 5 then due_at
        else now() + make_interval(secs => least(3600, (30 * power(2, greatest(attempts - 1, 0)))::integer)) end,
      last_error_code = p_reason_code,
      lease_token = null,
      lease_expires_at = null,
      updated_at = now()
  where id = p_objective_id and status = 'running' and lease_token = p_lease_token;
  get diagnostics changed = row_count;
  return changed = 1;
end;
$$;

revoke all on function public.fresh_ai_claim_learning_objectives(timestamptz, integer, integer) from public, anon, authenticated;
revoke all on function public.fresh_ai_complete_learning_objective(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.fresh_ai_fail_learning_objective(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.fresh_ai_claim_learning_objectives(timestamptz, integer, integer) to service_role;
grant execute on function public.fresh_ai_complete_learning_objective(uuid, uuid, text) to service_role;
grant execute on function public.fresh_ai_fail_learning_objective(uuid, uuid, text) to service_role;

comment on function public.fresh_ai_claim_learning_objectives(timestamptz, integer, integer) is
  'Atomically claims due Fresh AI learning objectives with bounded leases; service-role only.';
