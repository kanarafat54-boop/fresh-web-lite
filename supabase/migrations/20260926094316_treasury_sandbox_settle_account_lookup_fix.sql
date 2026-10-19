-- Fix user account ensure without relying on a unique constraint.
create or replace function public.treasury_sandbox_settle_rail_request(
  p_request_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
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
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into v_req
  from public.treasury_rail_requests
  where id = p_request_id
  for update;

  if v_req.id is null then
    raise exception 'Rail request not found';
  end if;
  if v_req.user_id <> auth.uid() then
    raise exception 'Not your rail request';
  end if;
  if v_req.status = 'settled' and v_req.ledger_transaction_id is not null then
    return v_req.ledger_transaction_id;
  end if;
  if v_req.status not in ('pending', 'awaiting_user', 'processing') then
    raise exception 'Request status % cannot be settled', v_req.status;
  end if;

  v_asset_kind := public.treasury_asset_kind_for_currency(v_req.currency_code);
  v_idem := 'sandbox-rail-' || v_req.id::text;

  select id into v_tx_id
  from public.treasury_transactions
  where idempotency_key = v_idem;

  if v_tx_id is not null then
    update public.treasury_rail_requests
    set status = 'settled',
        ledger_transaction_id = v_tx_id,
        external_reference = coalesce(external_reference, 'SANDBOX-' || replace(v_req.id::text, '-', '')),
        updated_at = now(),
        metadata = metadata || jsonb_build_object('sandbox', true, 'settled_at', now())
    where id = v_req.id;
    return v_tx_id;
  end if;

  select id into v_user_account_id
  from public.treasury_accounts
  where owner_id = auth.uid()
    and scope = 'user'
    and kind = 'asset'
    and asset_code = upper(v_req.currency_code)
    and active
  limit 1;

  if v_user_account_id is null then
    insert into public.treasury_accounts(owner_id, scope, kind, asset_code, asset_kind, display_name)
    values (
      auth.uid(), 'user', 'asset',
      upper(v_req.currency_code), v_asset_kind,
      upper(v_req.currency_code) || ' wallet'
    )
    returning id into v_user_account_id;
  end if;

  perform 1 from public.treasury_accounts where id = v_user_account_id for update;

  v_platform_account_id := public.treasury_ensure_platform_settlement_account(
    upper(v_req.currency_code), v_asset_kind
  );
  perform 1 from public.treasury_accounts where id = v_platform_account_id for update;

  if v_req.direction = 'withdrawal' then
    select balance_minor into v_balance
    from public.treasury_account_balances
    where account_id = v_user_account_id;

    if coalesce(v_balance, 0) < v_req.amount_minor then
      update public.treasury_rail_requests
      set status = 'failed',
          failure_reason = 'Insufficient balance for withdrawal',
          updated_at = now()
      where id = v_req.id;
      raise exception 'Insufficient balance for withdrawal';
    end if;
  end if;

  v_reference := 'SANDBOX-RAIL-' || replace(v_req.id::text, '-', '');

  insert into public.treasury_transactions(reference, idempotency_key, created_by, description, metadata)
  values (
    v_reference,
    v_idem,
    auth.uid(),
    format('Sandbox %s via %s', v_req.direction, v_req.method_id),
    jsonb_build_object(
      'sandbox', true,
      'rail_request_id', v_req.id,
      'method_id', v_req.method_id,
      'family', v_req.family,
      'direction', v_req.direction
    )
  )
  returning id into v_tx_id;

  if v_req.direction = 'deposit' then
    insert into public.treasury_entries(transaction_id, account_id, amount_minor, direction)
    values
      (v_tx_id, v_user_account_id, v_req.amount_minor, 'debit'),
      (v_tx_id, v_platform_account_id, v_req.amount_minor, 'credit');
  else
    insert into public.treasury_entries(transaction_id, account_id, amount_minor, direction)
    values
      (v_tx_id, v_user_account_id, v_req.amount_minor, 'credit'),
      (v_tx_id, v_platform_account_id, v_req.amount_minor, 'debit');
  end if;

  perform public.treasury_assert_transaction_balanced(v_tx_id);

  update public.treasury_rail_requests
  set status = 'settled',
      ledger_transaction_id = v_tx_id,
      external_reference = v_reference,
      failure_reason = null,
      updated_at = now(),
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'sandbox', true,
        'settled_at', now()
      )
  where id = v_req.id;

  return v_tx_id;
end;
$$;

notify pgrst, 'reload schema';
