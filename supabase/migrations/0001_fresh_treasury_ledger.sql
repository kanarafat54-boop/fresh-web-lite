-- Fresh Treasury: immutable double-entry ledger foundation.
-- This migration stores accounting facts only. It does not claim settlement or custody.

create extension if not exists pgcrypto;

do $$
begin
  create type public.treasury_scope as enum ('user', 'platform', 'owner');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.ledger_account_kind as enum ('asset', 'liability', 'revenue', 'expense', 'equity');
exception when duplicate_object then null;
end $$;

create table if not exists public.treasury_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id),
  scope public.treasury_scope not null,
  kind public.ledger_account_kind not null,
  asset_code text not null,
  asset_kind text not null check (asset_kind in ('fiat', 'crypto', 'fresh-coin', 'token')),
  display_name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint treasury_owner_scope_check check (
    (scope = 'user' and owner_id is not null)
    or (scope in ('platform', 'owner'))
  )
);

create table if not exists public.ledger_transactions (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  created_by uuid references auth.users(id),
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.ledger_transactions(id),
  account_id uuid not null references public.treasury_accounts(id),
  amount_minor bigint not null check (amount_minor > 0),
  direction text not null check (direction in ('debit', 'credit')),
  created_at timestamptz not null default now()
);

create index if not exists treasury_accounts_owner_idx
  on public.treasury_accounts(owner_id);
create index if not exists ledger_entries_account_idx
  on public.ledger_entries(account_id);
create index if not exists ledger_entries_transaction_idx
  on public.ledger_entries(transaction_id);

-- Ledger facts are append-only. Application code must never update/delete them.
create or replace function public.reject_ledger_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Ledger records are immutable';
end;
$$;

drop trigger if exists ledger_transactions_immutable on public.ledger_transactions;
create trigger ledger_transactions_immutable
before update or delete on public.ledger_transactions
for each row execute function public.reject_ledger_mutation();

drop trigger if exists ledger_entries_immutable on public.ledger_entries;
create trigger ledger_entries_immutable
before update or delete on public.ledger_entries
for each row execute function public.reject_ledger_mutation();

-- Balance is derived from journal entries; it is never stored as mutable UI state.
create or replace view public.treasury_account_balances as
select
  a.id as account_id,
  a.owner_id,
  a.scope,
  a.kind,
  a.asset_code,
  a.asset_kind,
  coalesce(sum(case when e.direction = 'debit' then e.amount_minor else -e.amount_minor end), 0)::bigint as balance_minor
from public.treasury_accounts a
left join public.ledger_entries e on e.account_id = a.id
group by a.id, a.owner_id, a.scope, a.kind, a.asset_code, a.asset_kind;

alter table public.treasury_accounts enable row level security;
alter table public.ledger_transactions enable row level security;
alter table public.ledger_entries enable row level security;

-- Users can see only their own user-scope accounts.
drop policy if exists treasury_accounts_user_select on public.treasury_accounts;
create policy treasury_accounts_user_select
on public.treasury_accounts
for select
to authenticated
using (scope = 'user' and owner_id = auth.uid());

-- Privileged platform/owner access is intentionally not exposed through client policies.
-- Server-side trusted code must use a service role or a dedicated privileged API boundary.

create or replace function public.assert_ledger_transaction_balanced(p_transaction_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  debit_total bigint;
  credit_total bigint;
begin
  select
    coalesce(sum(case when direction = 'debit' then amount_minor else 0 end), 0),
    coalesce(sum(case when direction = 'credit' then amount_minor else 0 end), 0)
  into debit_total, credit_total
  from public.ledger_entries
  where transaction_id = p_transaction_id;

  if debit_total = 0 or credit_total = 0 or debit_total <> credit_total then
    raise exception 'Ledger transaction % is not balanced', p_transaction_id;
  end if;

  return true;
end;
$$;
