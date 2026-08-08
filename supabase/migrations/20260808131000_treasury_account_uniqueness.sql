-- Prevent duplicate user wallets for the same asset while leaving platform
-- and owner account topologies flexible.
create unique index if not exists treasury_user_asset_unique
  on public.treasury_accounts(owner_id, asset_code, asset_kind)
  where scope = 'user' and kind = 'asset';
