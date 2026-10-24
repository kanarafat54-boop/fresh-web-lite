-- Restored from production schema (20260902055035): treasury internal transfer (final definition)
-- The original SQL for this version was never committed (placeholder). This file reconstructs the effective
-- end-state of the objects it introduced, from production catalogs read on 2026-10-23/24. Production has
-- already applied this version, so it will not re-run there. Everything below is idempotent.
-- Reconstruction note: statement-level history is not recoverable; final definitions are used.

CREATE OR REPLACE FUNCTION public.treasury_transfer_internal(p_actor_id uuid, p_from_account_id uuid, p_to_account_id uuid, p_amount_minor bigint, p_idempotency_key text, p_description text DEFAULT 'Fresh internal transfer'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
