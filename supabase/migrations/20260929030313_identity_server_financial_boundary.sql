
begin;

-- Replace client-callable financial RPC signatures with server-only actor-bound variants.
drop function if exists public.treasury_ensure_user_account(text,text,text);
drop function if exists public.treasury_resolve_recipient(text,text);
drop function if exists public.treasury_resolve_recipient_by_id(uuid,text);
drop function if exists public.treasury_create_rail_request(text,text,text,bigint,text,uuid,jsonb);
drop function if exists public.treasury_sandbox_settle_rail_request(uuid);
drop function if exists public.treasury_create_and_sandbox_settle_rail_request(text,text,text,bigint,text,uuid,jsonb);
drop function if exists public.treasury_transfer_internal(uuid,uuid,bigint,text,text);

create or replace function public.treasury_ensure_user_account(
  p_actor_id uuid,
  p_asset_code text,
  p_asset_kind text,
  p_display_name text default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_account_id uuid;
  v_code text := upper(trim(p_asset_code));
  v_name text := coalesce(nullif(trim(p_display_name), ''), 'Fresh Wallet ' || v_code);
begin
  if p_actor_id is null then raise exception 'Authentication required'; end if;
  if v_code !~ '^[A-Z0-9_]{2,24}$' then raise exception 'Invalid asset code'; end if;
  if p_asset_kind not in ('fiat','crypto','fresh-coin','token') then raise exception 'Invalid asset kind'; end if;

  insert into public.treasury_accounts(owner_id, scope, kind, asset_code, asset_kind, display_name)
  values (p_actor_id, 'user', 'asset', v_code, p_asset_kind, v_name)
  on conflict do nothing;

  select id into v_account_id
  from public.treasury_accounts
  where owner_id = p_actor_id and scope = 'user' and kind = 'asset'
    and asset_code = v_code and active
  limit 1;

  return v_account_id;
end;
$function$;

create or replace function public.treasury_resolve_recipient(
  p_actor_id uuid,
  p_username text,
  p_asset_code text default 'FRESH'
) returns table(account_id uuid, display_name text)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_recipient_id uuid;
  v_code text := upper(trim(p_asset_code));
begin
  if p_actor_id is null then raise exception 'Authentication required'; end if;

  select id into v_recipient_id from public.users
  where username = trim(p_username) limit 1;

  if v_recipient_id is null then raise exception 'No Fresh user found with that username'; end if;
  if v_recipient_id = p_actor_id then raise exception 'You cannot send Fresh Coin to yourself'; end if;

  return query
  select a.id, a.display_name
  from public.treasury_accounts a
  where a.owner_id = v_recipient_id and a.scope = 'user' and a.kind = 'asset'
    and a.asset_code = v_code and a.active
  limit 1;
end;
$function$;

create or replace function public.treasury_resolve_recipient_by_id(
  p_actor_id uuid,
  p_recipient_id uuid,
  p_asset_code text default 'FRESH'
) returns table(account_id uuid, display_name text)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_code text := upper(trim(p_asset_code));
begin
  if p_actor_id is null then raise exception 'Authentication required'; end if;
  if p_recipient_id = p_actor_id then raise exception 'You cannot gift yourself'; end if;

  return query
  select a.id, a.display_name
  from public.treasury_accounts a
  where a.owner_id = p_recipient_id and a.scope = 'user' and a.kind = 'asset'
    and a.asset_code = v_code and a.active
  limit 1;
end;
$function$;

create or replace function public.treasury_create_rail_request(
  p_actor_id uuid,
  p_direction text,
  p_method_id text,
  p_family text,
  p_amount_minor bigint,
  p_currency_code text,
  p_instrument_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare v_id uuid;
begin
  if p_actor_id is null then raise exception 'Authentication required'; end if;
  if p_direction not in ('deposit','withdrawal') then raise exception 'Invalid direction'; end if;
  if p_amount_minor is null or p_amount_minor <= 0 then raise exception 'Amount must be positive'; end if;
  if length(trim(coalesce(p_method_id,''))) < 2 then raise exception 'Method required'; end if;

  insert into public.treasury_rail_requests(
    user_id,direction,method_id,family,amount_minor,currency_code,instrument_id,status,metadata
  ) values (
    p_actor_id,p_direction,trim(p_method_id),trim(p_family),p_amount_minor,
    upper(trim(p_currency_code)),p_instrument_id,'pending',coalesce(p_metadata,'{}'::jsonb)
  ) returning id into v_id;
  return v_id;
end;
$function$;

create or replace function public.treasury_sandbox_settle_rail_request(
  p_actor_id uuid,
  p_request_id uuid
) returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_req public.treasury_rail_requests;
  v_user_account_id uuid;
  v_platform_account_id uuid;
  v_asset_kind text;
  v_balance bigint;
  v_tx_id uuid;
  v_reference text;
  v_idem text;
begin
  if p_actor_id is null then raise exception 'Authentication required'; end if;

  select * into v_req from public.treasury_rail_requests
  where id = p_request_id for update;

  if v_req.id is null then raise exception 'Rail request not found'; end if;
  if v_req.user_id <> p_actor_id then raise exception 'Not your rail request'; end if;
  if v_req.status = 'settled' and v_req.ledger_transaction_id is not null then return v_req.ledger_transaction_id; end if;
  if v_req.status not in ('pending','awaiting_user','processing') then
    raise exception 'Request status % cannot be settled', v_req.status;
  end if;

  v_asset_kind := public.treasury_asset_kind_for_currency(v_req.currency_code);
  v_idem := 'sandbox-rail-' || v_req.id::text;

  select id into v_tx_id from public.treasury_transactions where idempotency_key = v_idem;
  if v_tx_id is not null then
    update public.treasury_rail_requests
    set status='settled', ledger_transaction_id=v_tx_id,
        external_reference=coalesce(external_reference,'SANDBOX-'||replace(v_req.id::text,'-','')),
        updated_at=now(), metadata=metadata||jsonb_build_object('sandbox',true,'settled_at',now())
    where id=v_req.id;
    return v_tx_id;
  end if;

  select id into v_user_account_id from public.treasury_accounts
  where owner_id=p_actor_id and scope='user' and kind='asset'
    and asset_code=upper(v_req.currency_code) and active limit 1;

  if v_user_account_id is null then
    insert into public.treasury_accounts(owner_id,scope,kind,asset_code,asset_kind,display_name)
    values(p_actor_id,'user','asset',upper(v_req.currency_code),v_asset_kind,upper(v_req.currency_code)||' wallet')
    returning id into v_user_account_id;
  end if;

  perform 1 from public.treasury_accounts where id=v_user_account_id for update;
  v_platform_account_id := public.treasury_ensure_platform_settlement_account(upper(v_req.currency_code),v_asset_kind);
  perform 1 from public.treasury_accounts where id=v_platform_account_id for update;

  if v_req.direction='withdrawal' then
    select balance_minor into v_balance from public.treasury_account_balances where account_id=v_user_account_id;
    if coalesce(v_balance,0) < v_req.amount_minor then
      update public.treasury_rail_requests set status='failed',failure_reason='Insufficient balance for withdrawal',updated_at=now() where id=v_req.id;
      raise exception 'Insufficient balance for withdrawal';
    end if;
  end if;

  v_reference := 'SANDBOX-RAIL-' || replace(v_req.id::text,'-','');

  insert into public.treasury_transactions(reference,idempotency_key,created_by,description,metadata)
  values(v_reference,v_idem,p_actor_id,format('Sandbox %s via %s',v_req.direction,v_req.method_id),
    jsonb_build_object('sandbox',true,'rail_request_id',v_req.id,'method_id',v_req.method_id,'family',v_req.family,'direction',v_req.direction))
  returning id into v_tx_id;

  if v_req.direction='deposit' then
    insert into public.treasury_entries(transaction_id,account_id,amount_minor,direction)
    values(v_tx_id,v_user_account_id,v_req.amount_minor,'debit'),(v_tx_id,v_platform_account_id,v_req.amount_minor,'credit');
  else
    insert into public.treasury_entries(transaction_id,account_id,amount_minor,direction)
    values(v_tx_id,v_user_account_id,v_req.amount_minor,'credit'),(v_tx_id,v_platform_account_id,v_req.amount_minor,'debit');
  end if;

  perform public.treasury_assert_transaction_balanced(v_tx_id);

  update public.treasury_rail_requests
  set status='settled',ledger_transaction_id=v_tx_id,external_reference=v_reference,failure_reason=null,
      updated_at=now(),metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('sandbox',true,'settled_at',now())
  where id=v_req.id;

  return v_tx_id;
end;
$function$;

create or replace function public.treasury_create_and_sandbox_settle_rail_request(
  p_actor_id uuid,
  p_direction text,
  p_method_id text,
  p_family text,
  p_amount_minor bigint,
  p_currency_code text,
  p_instrument_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare v_id uuid; v_tx uuid;
begin
  v_id := public.treasury_create_rail_request(
    p_actor_id,p_direction,p_method_id,p_family,p_amount_minor,p_currency_code,p_instrument_id,
    coalesce(p_metadata,'{}'::jsonb)||jsonb_build_object('sandbox',true)
  );
  v_tx := public.treasury_sandbox_settle_rail_request(p_actor_id,v_id);
  return jsonb_build_object('request_id',v_id,'ledger_transaction_id',v_tx,'status','settled','sandbox',true);
end;
$function$;

create or replace function public.treasury_transfer_internal(
  p_actor_id uuid,
  p_from_account_id uuid,
  p_to_account_id uuid,
  p_amount_minor bigint,
  p_idempotency_key text,
  p_description text default 'Fresh internal transfer'
) returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_from public.treasury_accounts;
  v_to public.treasury_accounts;
  v_balance bigint;
  v_transaction_id uuid;
  v_reference text;
begin
  if p_actor_id is null then raise exception 'Authentication required'; end if;
  if p_amount_minor <= 0 then raise exception 'Transfer amount must be positive'; end if;
  if p_from_account_id = p_to_account_id then raise exception 'Source and destination accounts must differ'; end if;
  if length(trim(coalesce(p_idempotency_key,''))) < 8 then raise exception 'A strong idempotency key is required'; end if;

  select id into v_transaction_id from public.treasury_transactions
  where idempotency_key=p_idempotency_key and created_by=p_actor_id;
  if v_transaction_id is not null then return v_transaction_id; end if;

  perform 1 from public.treasury_accounts
  where id in (p_from_account_id,p_to_account_id) order by id for update;

  select * into v_from from public.treasury_accounts where id=p_from_account_id;
  select * into v_to from public.treasury_accounts where id=p_to_account_id;

  if v_from.id is null or v_to.id is null then raise exception 'Treasury account not found'; end if;
  if v_from.scope <> 'user' or v_to.scope <> 'user' then raise exception 'Internal transfer is restricted to user accounts'; end if;
  if v_from.owner_id <> p_actor_id then raise exception 'You do not control the source treasury account'; end if;
  if not v_from.active or not v_to.active then raise exception 'Treasury account is inactive'; end if;
  if v_from.kind <> 'asset' or v_to.kind <> 'asset' then raise exception 'Internal transfer requires asset accounts'; end if;
  if v_from.asset_code <> v_to.asset_code or v_from.asset_kind <> v_to.asset_kind then raise exception 'Source and destination assets must match'; end if;

  select balance_minor into v_balance from public.treasury_account_balances where account_id=v_from.id;
  if coalesce(v_balance,0) < p_amount_minor then raise exception 'Insufficient available balance'; end if;

  v_reference := 'FW-' || replace(gen_random_uuid()::text,'-','');

  insert into public.treasury_transactions(reference,idempotency_key,created_by,description)
  values(v_reference,p_idempotency_key,p_actor_id,p_description)
  returning id into v_transaction_id;

  insert into public.treasury_entries(transaction_id,account_id,amount_minor,direction)
  values(v_transaction_id,v_to.id,p_amount_minor,'debit'),(v_transaction_id,v_from.id,p_amount_minor,'credit');

  perform public.treasury_assert_transaction_balanced(v_transaction_id);
  return v_transaction_id;
exception
  when unique_violation then
    select id into v_transaction_id from public.treasury_transactions
    where idempotency_key=p_idempotency_key and created_by=p_actor_id;
    if v_transaction_id is not null then return v_transaction_id; end if;
    raise;
end;
$function$;

-- Explicit server-only execution boundary.
revoke all on function public.treasury_ensure_user_account(uuid,text,text,text) from public, anon, authenticated;
revoke all on function public.treasury_resolve_recipient(uuid,text,text) from public, anon, authenticated;
revoke all on function public.treasury_resolve_recipient_by_id(uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.treasury_create_rail_request(uuid,text,text,text,bigint,text,uuid,jsonb) from public, anon, authenticated;
revoke all on function public.treasury_sandbox_settle_rail_request(uuid,uuid) from public, anon, authenticated;
revoke all on function public.treasury_create_and_sandbox_settle_rail_request(uuid,text,text,text,bigint,text,uuid,jsonb) from public, anon, authenticated;
revoke all on function public.treasury_transfer_internal(uuid,uuid,uuid,bigint,text,text) from public, anon, authenticated;
grant execute on function public.treasury_ensure_user_account(uuid,text,text,text) to service_role;
grant execute on function public.treasury_resolve_recipient(uuid,text,text) to service_role;
grant execute on function public.treasury_resolve_recipient_by_id(uuid,uuid,text) to service_role;
grant execute on function public.treasury_create_rail_request(uuid,text,text,text,bigint,text,uuid,jsonb) to service_role;
grant execute on function public.treasury_sandbox_settle_rail_request(uuid,uuid) to service_role;
grant execute on function public.treasury_create_and_sandbox_settle_rail_request(uuid,text,text,text,bigint,text,uuid,jsonb) to service_role;
grant execute on function public.treasury_transfer_internal(uuid,uuid,uuid,bigint,text,text) to service_role;

-- Harden browser-readable legacy wallet tables: authenticated-only ownership reads.
drop policy if exists "Users can view their own balance" on public.wallet_balances;
create policy "Users can view their own balance"
on public.wallet_balances for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can view their own transactions" on public.wallet_transactions;
create policy "Users can view their own transactions"
on public.wallet_transactions for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "own wallet" on public.wallets;
create policy "own wallet"
on public.wallets for select to authenticated
using ((select auth.uid()) = user_id);

commit;
