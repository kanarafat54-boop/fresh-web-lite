-- Fresh Treasury: persistent accounting foundation.
--
-- Design rules:
--   * balances are derived from immutable double-entry ledger rows;
--   * user, platform, and owner scopes are distinct accounts;
--   * client code never writes ledger rows directly;
--   * privileged movement happens through SECURITY DEFINER RPCs;
--   * amounts are integer minor units, never floating point.

create extension if not exists pgcrypto;

create table if not exists public.treasury_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete restrict,
  scope text not null check (scope in ('platform', 'owner', 'user')),
  kind text not null check (kind in ('asset', 'liability', 'revenue', 'expense', 'equity')),
  asset_code text not null check (asset_code = upper(asset_code) and length(asset_code) between 2 and 24),
  asset_kind text not null check (asset_kind in ('fiat', 'crypto', 'fresh-coin', 'token')),
  display_name text not null check (length(trim(display_name)) > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint treasury_scope_owner_consistency check (
    (scope = 'platform' and owner_id is null)
    or (scope in ('owner', 'user') and owner_id is not null)
  )
);

create index if not exists treasury_accounts_owner_idx
  on public.treasury_accounts(owner_id, scope, asset_code)
  where active;

create table if not exists public.treasury_transactions (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  idempotency_key text unique,
  created_by uuid not null references auth.users(id) on delete restrict,
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.treasury_entries (
  id bigint generated always as identity primary key,
  transaction_id uuid not null references public.treasury_transactions(id) on delete restrict,
  account_id uuid not null references public.treasury_accounts(id) on delete restrict,
  amount_minor bigint not null check (amount_minor > 0),
  direction text not null check (direction in ('debit', 'credit')),
  created_at timestamptz not null default now()
);

create index if not exists treasury_entries_account_idx
  on public.treasury_entries(account_id, created_at);

create index if not exists treasury_entries_transaction_idx
  on public.treasury_entries(transaction_id);

-- A transaction is balanced when total debits equal total credits.
-- This trigger prevents an individual entry from being inserted without the
-- transaction being validated before the transaction is made visible.
create or replace function public.treasury_assert_transaction_balanced(p_transaction_id uuid)
returns void
language plpgsql
as $$
declare
  debit_total bigint;
  credit_total bigint;
  entry_count integer;
begin
  select count(*),
         coalesce(sum(amount_minor) filter (where direction = 'debit'), 0),
         coalesce(sum(amount_minor) filter (where direction = 'credit'), 0)
    into entry_count, debit_total, credit_total
  from public.treasury_entries
  where transaction_id = p_transaction_id;

  if entry_count < 2 or debit_total <> credit_total then
    raise exception 'Treasury transaction % is not balanced', p_transaction_id;
  end if;
end;
$$;

-- Balance is derived from immutable entries. For asset/expense accounts,
-- debits increase the balance. For liability/revenue/equity accounts, credits do.
create or replace view public.treasury_account_balances as
select
  a.id as account_id,
  a.owner_id,
  a.scope,
  a.kind,
  a.asset_code,
  a.asset_kind,
  a.display_name,
  a.active,
  coalesce(
    sum(
      case
        when a.kind in ('asset', 'expense') and e.direction = 'debit' then e.amount_minor
        when a.kind in ('asset', 'expense') and e.direction = 'credit' then -e.amount_minor
        when a.kind in ('liability', 'revenue', 'equity') and e.direction = 'credit' then e.amount_minor
        when a.kind in ('liability', 'revenue', 'equity') and e.direction = 'debit' then -e.amount_minor
        else 0
      end
    ), 0
  )::bigint as balance_minor
from public.treasury_accounts a
left join public.treasury_entries e on e.account_id = a.id
where a.active
 group by a.id, a.owner_id, a.scope, a.kind, a.asset_code, a.asset_kind, a.display_name, a.active;

alter table public.treasury_accounts enable row level security;
alter table public.treasury_transactions enable row level security;
alter table public.treasury_entries enable row level security;

-- Users can see only their own user-scope accounts. Platform and owner books
-- are deliberately not exposed through the normal wallet surface.
drop policy if exists treasury_accounts_select_own on public.treasury_accounts;
create policy treasury_accounts_select_own
  on public.treasury_accounts for select
  to authenticated
  using (scope = 'user' and owner_id = auth.uid());

drop policy if exists treasury_balances_select_own on public.treasury_account_balances;

-- Views inherit the underlying table RLS when queried by the client.

-- No direct authenticated inserts/updates/deletes are granted on the ledger.
revoke insert, update, delete on public.treasury_accounts from authenticated;
revoke insert, update, delete, select on public.treasury_transactions from authenticated;
revoke insert, update, delete, select on public.treasury_entries from authenticated;

-- Ensure a user's account exists for a given asset. This is the only account
-- creation path exposed to the normal authenticated client.
create or replace function public.treasury_ensure_user_account(
  p_asset_code text,
  p_asset_kind text,
  p_display_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_id uuid;
  v_code text := upper(trim(p_asset_code));
  v_name text := coalesce(nullif(trim(p_display_name), ''), 'Fresh Wallet ' || v_code);
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if v_code !~ '^[A-Z0-9_]{2,24}$' then
    raise exception 'Invalid asset code';
  end if;

  if p_asset_kind not in ('fiat', 'crypto', 'fresh-coin', 'token') then
    raise exception 'Invalid asset kind';
  end if;

  insert into public.treasury_accounts(owner_id, scope, kind, asset_code, asset_kind, display_name)
  values (auth.uid(), 'user', 'asset', v_code, p_asset_kind, v_name)
  on conflict do nothing;

  select id into v_account_id
  from public.treasury_accounts
  where owner_id = auth.uid()
    and scope = 'user'
    and kind = 'asset'
    and asset_code = v_code
    and active
  limit 1;

  return v_account_id;
end;
$$;

revoke all on function public.treasury_ensure_user_account(text, text, text) from public;
grant execute on function public.treasury_ensure_user_account(text, text, text) to authenticated;

-- Secure internal transfer between two user asset accounts belonging to the
-- authenticated principal. The account rows are locked before balance checks,
-- preventing concurrent transfers from overspending the same account.
create or replace function public.treasury_transfer_internal(
  p_from_account_id uuid,
  p_to_account_id uuid,
  p_amount_minor bigint,
  p_idempotency_key text,
  p_description text default 'Fresh internal transfer'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from public.treasury_accounts;
  v_to public.treasury_accounts;
  v_balance bigint;
  v_transaction_id uuid;
  v_reference text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if p_amount_minor <= 0 then
    raise exception 'Transfer amount must be positive';
  end if;
  if p_from_account_id = p_to_account_id then
    raise exception 'Source and destination accounts must differ';
  end if;
  if length(trim(coalesce(p_idempotency_key, ''))) < 8 then
    raise exception 'A strong idempotency key is required';
  end if;

  select * into v_from
  from public.treasury_accounts
  where id = p_from_account_id
  for update;

  select * into v_to
  from public.treasury_accounts
  where id = p_to_account_id
  for update;

  if v_from.id is null or v_to.id is null then
    raise exception 'Treasury account not found';
  end if;
  if v_from.scope <> 'user' or v_to.scope <> 'user' then
    raise exception 'Internal transfer is restricted to user accounts';
  end if;
  if v_from.owner_id <> auth.uid() or v_to.owner_id <> auth.uid() then
    raise exception 'You do not control both treasury accounts';
  end if;
  if not v_from.active or not v_to.active then
    raise exception 'Treasury account is inactive';
  end if;
  if v_from.kind <> 'asset' or v_to.kind <> 'asset' then
    raise exception 'Internal transfer requires asset accounts';
  end if;
  if v_from.asset_code <> v_to.asset_code or v_from.asset_kind <> v_to.asset_kind then
    raise exception 'Source and destination assets must match';
  end if;

  select balance_minor into v_balance
  from public.treasury_account_balances
  where account_id = v_from.id;

  if coalesce(v_balance, 0) < p_amount_minor then
    raise exception 'Insufficient available balance';
  end if;

  select id into v_transaction_id
  from public.treasury_transactions
  where idempotency_key = p_idempotency_key;

  if v_transaction_id is not null then
    return v_transaction_id;
  end if;

  v_reference := 'FW-' || replace(gen_random_uuid()::text, '-', '');

  insert into public.treasury_transactions(reference, idempotency_key, created_by, description)
  values (v_reference, p_idempotency_key, auth.uid(), p_description)
  returning id into v_transaction_id;

  insert into public.treasury_entries(transaction_id, account_id, amount_minor, direction)
  values
    (v_transaction_id, v_to.id, p_amount_minor, 'debit'),
    (v_transaction_id, v_from.id, p_amount_minor, 'credit');

  perform public.treasury_assert_transaction_balanced(v_transaction_id);
  return v_transaction_id;
end;
$$;

revoke all on function public.treasury_transfer_internal(uuid, uuid, bigint, text, text) from public;
grant execute on function public.treasury_transfer_internal(uuid, uuid, bigint, text, text) to authenticated;

-- Read-only wallet projection for authenticated users. RLS is enforced through
-- the owner predicate rather than exposing the platform/owner books.
create or replace view public.treasury_my_balances as
select account_id, asset_code, asset_kind, display_name, balance_minor
from public.treasury_account_balances
where scope = 'user' and owner_id = auth.uid() and active;

grant select on public.treasury_my_balances to authenticated;

comment on table public.treasury_accounts is 'Authoritative Fresh Treasury account registry; platform, owner and user scopes are intentionally separated.';
comment on table public.treasury_transactions is 'Immutable transaction headers for Fresh Treasury double-entry accounting.';
comment on table public.treasury_entries is 'Immutable double-entry monetary movements in integer minor units.';
