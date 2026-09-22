-- Compatibility projection required by the existing treasury security hardening.
-- Safe on production where the view already exists and on clean previews where
-- older treasury migrations may not have materialized it yet.

create or replace view public.my_treasury_balances as
select
  account_id,
  asset_code,
  asset_kind,
  balance_minor
from public.treasury_account_balances
where scope = 'user'
  and owner_id = auth.uid();

