-- Fix: wallet balances/transactions fail with
-- "permission denied for table treasury_entries"
-- because security_invoker views join treasury_entries / treasury_transactions
-- while SELECT was fully revoked and no RLS policies existed.
--
-- Users may READ only ledger rows that belong to their own user-scope accounts.
-- All writes remain blocked for the authenticated role (mutations go through SECURITY DEFINER RPCs).

alter table public.treasury_entries enable row level security;
alter table public.treasury_transactions enable row level security;

-- Table-level SELECT is required for RLS policies to be evaluated.
grant select on public.treasury_entries to authenticated;
grant select on public.treasury_transactions to authenticated;

-- Keep mutation paths closed to the client role.
revoke insert, update, delete on public.treasury_entries from authenticated;
revoke insert, update, delete on public.treasury_transactions from authenticated;

drop policy if exists treasury_entries_select_own on public.treasury_entries;
create policy treasury_entries_select_own
  on public.treasury_entries
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.treasury_accounts a
      where a.id = account_id
        and a.scope = 'user'
        and a.owner_id = auth.uid()
    )
  );

drop policy if exists treasury_transactions_select_own on public.treasury_transactions;
create policy treasury_transactions_select_own
  on public.treasury_transactions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.treasury_entries e
      join public.treasury_accounts a on a.id = e.account_id
      where e.transaction_id = id
        and a.scope = 'user'
        and a.owner_id = auth.uid()
    )
  );

-- Ensure balance/transaction projections remain invoker-scoped and granted.
do $$
begin
  if to_regclass('public.treasury_my_balances') is not null then
    execute 'alter view public.treasury_my_balances set (security_invoker = true)';
    execute 'grant select on public.treasury_my_balances to authenticated';
  end if;
  if to_regclass('public.my_treasury_balances') is not null then
    execute 'alter view public.my_treasury_balances set (security_invoker = true)';
    execute 'grant select on public.my_treasury_balances to authenticated';
  end if;
  if to_regclass('public.treasury_my_transactions') is not null then
    execute 'alter view public.treasury_my_transactions set (security_invoker = true)';
    execute 'grant select on public.treasury_my_transactions to authenticated';
  end if;
  if to_regclass('public.treasury_account_balances') is not null then
    execute 'alter view public.treasury_account_balances set (security_invoker = true)';
  end if;
end;
$$;

notify pgrst, 'reload schema';
