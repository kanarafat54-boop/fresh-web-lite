-- Resolve a recipient's treasury account for internal transfers by username.
-- Exposes only the minimal information needed to address a transfer: the
-- target account id and display name. Never exposes balance, email, or any
-- other user data through this path.
create or replace function public.treasury_resolve_recipient(
  p_username text,
  p_asset_code text default 'FRESH'
)
returns table (account_id uuid, display_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipient_id uuid;
  v_code text := upper(trim(p_asset_code));
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select id into v_recipient_id
  from public.users
  where username = trim(p_username)
  limit 1;

  if v_recipient_id is null then
    raise exception 'No Fresh user found with that username';
  end if;

  if v_recipient_id = auth.uid() then
    raise exception 'You cannot send Fresh Coin to yourself';
  end if;

  return query
  select a.id, a.display_name
  from public.treasury_accounts a
  where a.owner_id = v_recipient_id
    and a.scope = 'user'
    and a.kind = 'asset'
    and a.asset_code = v_code
    and a.active
  limit 1;
end;
$$;

revoke all on function public.treasury_resolve_recipient(text, text) from public;
grant execute on function public.treasury_resolve_recipient(text, text) to authenticated;
