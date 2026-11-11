-- Fresh Machine Access, phase 1 (read-only): machine identities, scoped revocable credentials, a database-enforced
-- rate limit and an append-only audit log. See docs/FRESH_MACHINE_ACCESS_DESIGN.md.
--
-- Additive: four new tables and one function. No client (anon / authenticated) can touch any of them; only the
-- server's service role can, through the gateway. Tokens are never stored: only their SHA-256 hash.

create table if not exists public.machine_principals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  name text not null check (char_length(name) between 2 and 80),
  purpose text not null check (char_length(purpose) between 5 and 300),
  contact text check (contact is null or char_length(contact) <= 200),
  disabled_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.machine_credentials (
  id uuid primary key default gen_random_uuid(),
  principal_id uuid not null references public.machine_principals(id) on delete cascade,
  token_prefix text not null check (char_length(token_prefix) = 8),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  -- Phase 1 only knows read scopes. New scopes arrive with new migrations, never by editing a row.
  scopes text[] not null check (cardinality(scopes) >= 1 and scopes <@ array['shorts:read', 'proof:read']::text[]),
  rate_limit_per_minute integer not null default 60 check (rate_limit_per_minute between 1 and 600),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists machine_credentials_principal_idx on public.machine_credentials (principal_id);

create table if not exists public.machine_rate (
  credential_id uuid not null references public.machine_credentials(id) on delete cascade,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (credential_id, window_start)
);
create index if not exists machine_rate_window_idx on public.machine_rate (window_start);

-- Who called what and with what result. No request or response bodies, no secrets.
create table if not exists public.machine_audit (
  id bigint generated always as identity primary key,
  principal_id uuid,
  credential_id uuid,
  method text not null,
  path text not null check (char_length(path) <= 300),
  status integer not null,
  created_at timestamptz not null default now()
);
create index if not exists machine_audit_principal_idx on public.machine_audit (principal_id, created_at desc);

create or replace function public.machine_audit_refuse_change()
returns trigger language plpgsql as $$
begin
  raise exception 'machine audit records are append-only';
end;
$$;
drop trigger if exists machine_audit_no_update on public.machine_audit;
create trigger machine_audit_no_update before update on public.machine_audit for each row execute function public.machine_audit_refuse_change();
drop trigger if exists machine_audit_no_delete on public.machine_audit;
create trigger machine_audit_no_delete before delete on public.machine_audit for each row execute function public.machine_audit_refuse_change();

alter table public.machine_principals enable row level security;
alter table public.machine_credentials enable row level security;
alter table public.machine_rate enable row level security;
alter table public.machine_audit enable row level security;
revoke all on public.machine_principals, public.machine_credentials, public.machine_rate, public.machine_audit from anon, authenticated;

-- One call checks the token, applies the per-minute limit and records last use. Only the service role may run it.
create or replace function public.machine_authenticate(p_token_hash text)
returns table (ok boolean, reason text, credential_id uuid, principal_id uuid, scopes text[], retry_after integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  c record;
  win timestamptz := date_trunc('minute', now());
  n integer;
begin
  select cr.id, cr.principal_id, cr.scopes, cr.rate_limit_per_minute, cr.expires_at, cr.revoked_at, p.disabled_at
    into c
    from public.machine_credentials cr join public.machine_principals p on p.id = cr.principal_id
   where cr.token_hash = p_token_hash;
  if not found then
    return query select false, 'unknown_token', null::uuid, null::uuid, null::text[], 0; return;
  end if;
  if c.revoked_at is not null then
    return query select false, 'revoked', c.id, c.principal_id, null::text[], 0; return;
  end if;
  if c.expires_at <= now() then
    return query select false, 'expired', c.id, c.principal_id, null::text[], 0; return;
  end if;
  if c.disabled_at is not null then
    return query select false, 'principal_disabled', c.id, c.principal_id, null::text[], 0; return;
  end if;

  delete from public.machine_rate where window_start < now() - interval '1 hour';
  insert into public.machine_rate (credential_id, window_start, hits) values (c.id, win, 1)
    on conflict on constraint machine_rate_pkey do update set hits = public.machine_rate.hits + 1
    returning hits into n;
  if n > c.rate_limit_per_minute then
    return query select false, 'rate_limited', c.id, c.principal_id, null::text[],
      greatest(1, ceil(extract(epoch from (win + interval '1 minute' - now())))::integer);
    return;
  end if;

  update public.machine_credentials set last_used_at = now() where id = c.id;
  return query select true, 'ok', c.id, c.principal_id, c.scopes, 0;
end;
$$;

revoke all on function public.machine_authenticate(text) from public, anon, authenticated;
grant execute on function public.machine_authenticate(text) to service_role;
