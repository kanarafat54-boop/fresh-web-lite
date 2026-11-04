-- Restored from production schema (20260828075132): treasury accounts, entries, rail requests, balance views and helpers
-- The original SQL for this version was never committed (placeholder). This file reconstructs the effective
-- end-state of the objects it introduced, from production catalogs read on 2026-10-23/24. Production has
-- already applied this version, so it will not re-run there. Everything below is idempotent.
-- Reconstruction note: statement-level history is not recoverable; final definitions are used.

-- Extensions present in production (Supabase-managed): pg_stat_statements, pgcrypto (extensions schema),
-- plpgsql, supabase_vault, uuid-ossp (extensions schema). gen_random_uuid() is built in to PostgreSQL 13+.
do $$
begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where n.nspname = 'public' and t.typname = 'ledger_account_kind') then
    create type public.ledger_account_kind as enum ('asset', 'liability', 'revenue', 'expense', 'equity');
  end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where n.nspname = 'public' and t.typname = 'treasury_scope') then
    create type public.treasury_scope as enum ('user', 'platform', 'owner');
  end if;
end
$$;

create table if not exists public.treasury_accounts (
  id uuid default gen_random_uuid() not null,
  owner_id uuid,
  scope treasury_scope not null,
  kind ledger_account_kind not null,
  asset_code text not null,
  asset_kind text not null,
  display_name text not null,
  active boolean default true not null,
  created_at timestamp with time zone default now() not null,
  constraint treasury_accounts_asset_kind_check CHECK ((asset_kind = ANY (ARRAY['fiat'::text, 'crypto'::text, 'fresh-coin'::text, 'token'::text]))),
  constraint treasury_accounts_pkey PRIMARY KEY (id),
  constraint treasury_owner_scope_check CHECK ((((scope = 'user'::treasury_scope) AND (owner_id IS NOT NULL)) OR (scope = ANY (ARRAY['platform'::treasury_scope, 'owner'::treasury_scope]))))
);

-- Bring a pre-existing, older-shaped table up to the production column set (no-ops where present).
alter table public.treasury_accounts add column if not exists id uuid default gen_random_uuid() not null;
alter table public.treasury_accounts add column if not exists owner_id uuid;
alter table public.treasury_accounts add column if not exists scope treasury_scope not null;
alter table public.treasury_accounts add column if not exists kind ledger_account_kind not null;
alter table public.treasury_accounts add column if not exists asset_code text not null;
alter table public.treasury_accounts add column if not exists asset_kind text not null;
alter table public.treasury_accounts add column if not exists display_name text not null;
alter table public.treasury_accounts add column if not exists active boolean default true not null;
alter table public.treasury_accounts add column if not exists created_at timestamp with time zone default now() not null;

create table if not exists public.treasury_transactions (
  id uuid default gen_random_uuid() not null,
  reference text not null,
  idempotency_key text,
  created_by uuid not null,
  description text not null,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  constraint treasury_transactions_idempotency_key_key UNIQUE (idempotency_key),
  constraint treasury_transactions_pkey PRIMARY KEY (id),
  constraint treasury_transactions_reference_key UNIQUE (reference)
);

-- Bring a pre-existing, older-shaped table up to the production column set (no-ops where present).
alter table public.treasury_transactions add column if not exists id uuid default gen_random_uuid() not null;
alter table public.treasury_transactions add column if not exists reference text not null;
alter table public.treasury_transactions add column if not exists idempotency_key text;
alter table public.treasury_transactions add column if not exists created_by uuid not null;
alter table public.treasury_transactions add column if not exists description text not null;
alter table public.treasury_transactions add column if not exists metadata jsonb default '{}'::jsonb not null;
alter table public.treasury_transactions add column if not exists created_at timestamp with time zone default now() not null;

create table if not exists public.treasury_entries (
  id bigint generated always as identity not null,
  transaction_id uuid not null,
  account_id uuid not null,
  amount_minor bigint not null,
  direction text not null,
  created_at timestamp with time zone default now() not null,
  constraint treasury_entries_amount_minor_check CHECK ((amount_minor > 0)),
  constraint treasury_entries_direction_check CHECK ((direction = ANY (ARRAY['debit'::text, 'credit'::text]))),
  constraint treasury_entries_pkey PRIMARY KEY (id)
);

-- Bring a pre-existing, older-shaped table up to the production column set (no-ops where present).
alter table public.treasury_entries add column if not exists id bigint generated always as identity not null;
alter table public.treasury_entries add column if not exists transaction_id uuid not null;
alter table public.treasury_entries add column if not exists account_id uuid not null;
alter table public.treasury_entries add column if not exists amount_minor bigint not null;
alter table public.treasury_entries add column if not exists direction text not null;
alter table public.treasury_entries add column if not exists created_at timestamp with time zone default now() not null;

create table if not exists public.treasury_payment_instruments (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  method_id text not null,
  family text not null,
  label text not null,
  display_hint text,
  currency_code text not null,
  metadata jsonb default '{}'::jsonb not null,
  active boolean default true not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint treasury_payment_instruments_currency_code_check CHECK ((currency_code = upper(currency_code))),
  constraint treasury_payment_instruments_family_check CHECK ((family = ANY (ARRAY['mobile_money'::text, 'bank_transfer'::text, 'card'::text, 'digital_wallet'::text, 'crypto_onchain'::text, 'instant_rail'::text, 'agent_cash'::text, 'ussd_banking'::text]))),
  constraint treasury_payment_instruments_label_check CHECK ((length(TRIM(BOTH FROM label)) > 0)),
  constraint treasury_payment_instruments_pkey PRIMARY KEY (id)
);

-- Bring a pre-existing, older-shaped table up to the production column set (no-ops where present).
alter table public.treasury_payment_instruments add column if not exists id uuid default gen_random_uuid() not null;
alter table public.treasury_payment_instruments add column if not exists user_id uuid not null;
alter table public.treasury_payment_instruments add column if not exists method_id text not null;
alter table public.treasury_payment_instruments add column if not exists family text not null;
alter table public.treasury_payment_instruments add column if not exists label text not null;
alter table public.treasury_payment_instruments add column if not exists display_hint text;
alter table public.treasury_payment_instruments add column if not exists currency_code text not null;
alter table public.treasury_payment_instruments add column if not exists metadata jsonb default '{}'::jsonb not null;
alter table public.treasury_payment_instruments add column if not exists active boolean default true not null;
alter table public.treasury_payment_instruments add column if not exists created_at timestamp with time zone default now() not null;
alter table public.treasury_payment_instruments add column if not exists updated_at timestamp with time zone default now() not null;

create table if not exists public.treasury_rail_requests (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  direction text not null,
  method_id text not null,
  family text not null,
  amount_minor bigint not null,
  currency_code text not null,
  instrument_id uuid,
  status text default 'pending'::text not null,
  external_reference text,
  failure_reason text,
  ledger_transaction_id uuid,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint treasury_rail_requests_amount_minor_check CHECK ((amount_minor > 0)),
  constraint treasury_rail_requests_currency_code_check CHECK ((currency_code = upper(currency_code))),
  constraint treasury_rail_requests_direction_check CHECK ((direction = ANY (ARRAY['deposit'::text, 'withdrawal'::text]))),
  constraint treasury_rail_requests_pkey PRIMARY KEY (id),
  constraint treasury_rail_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'awaiting_user'::text, 'processing'::text, 'settled'::text, 'failed'::text, 'cancelled'::text])))
);

-- Bring a pre-existing, older-shaped table up to the production column set (no-ops where present).
alter table public.treasury_rail_requests add column if not exists id uuid default gen_random_uuid() not null;
alter table public.treasury_rail_requests add column if not exists user_id uuid not null;
alter table public.treasury_rail_requests add column if not exists direction text not null;
alter table public.treasury_rail_requests add column if not exists method_id text not null;
alter table public.treasury_rail_requests add column if not exists family text not null;
alter table public.treasury_rail_requests add column if not exists amount_minor bigint not null;
alter table public.treasury_rail_requests add column if not exists currency_code text not null;
alter table public.treasury_rail_requests add column if not exists instrument_id uuid;
alter table public.treasury_rail_requests add column if not exists status text default 'pending'::text not null;
alter table public.treasury_rail_requests add column if not exists external_reference text;
alter table public.treasury_rail_requests add column if not exists failure_reason text;
alter table public.treasury_rail_requests add column if not exists ledger_transaction_id uuid;
alter table public.treasury_rail_requests add column if not exists metadata jsonb default '{}'::jsonb not null;
alter table public.treasury_rail_requests add column if not exists created_at timestamp with time zone default now() not null;
alter table public.treasury_rail_requests add column if not exists updated_at timestamp with time zone default now() not null;

CREATE OR REPLACE FUNCTION public.create_treasury_transaction(p_reference text, p_description text, p_entries jsonb, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_transaction_id uuid;
  v_entry jsonb;
  v_account_id uuid;
  v_amount bigint;
  v_direction text;
  v_debits bigint := 0;
  v_credits bigint := 0;
  v_owner_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if nullif(trim(p_reference), '') is null or nullif(trim(p_description), '') is null then
    raise exception 'Reference and description are required';
  end if;

  if jsonb_typeof(p_entries) <> 'array' or jsonb_array_length(p_entries) < 2 then
    raise exception 'At least two ledger entries are required';
  end if;

  insert into public.ledger_transactions(reference, created_by, description, metadata)
  values (p_reference, auth.uid(), p_description, coalesce(p_metadata, '{}'::jsonb))
  returning id into v_transaction_id;

  for v_entry in select value from jsonb_array_elements(p_entries)
  loop
    begin
      v_account_id := (v_entry->>'accountId')::uuid;
      v_amount := (v_entry->>'amountMinor')::bigint;
      v_direction := v_entry->>'direction';
    exception when others then
      raise exception 'Invalid ledger entry format';
    end;

    if v_amount <= 0 or v_direction not in ('debit', 'credit') then
      raise exception 'Invalid ledger entry';
    end if;

    select owner_id into v_owner_id
    from public.treasury_accounts
    where id = v_account_id and active = true;

    if not found then
      raise exception 'Treasury account does not exist or is inactive';
    end if;

    if v_owner_id is not null and v_owner_id <> auth.uid() then
      raise exception 'Cannot post to another user account';
    end if;

    if v_direction = 'debit' then
      v_debits := v_debits + v_amount;
    else
      v_credits := v_credits + v_amount;
    end if;

    insert into public.ledger_entries(transaction_id, account_id, amount_minor, direction)
    values (v_transaction_id, v_account_id, v_amount, v_direction);
  end loop;

  if v_debits = 0 or v_debits <> v_credits then
    raise exception 'Ledger transaction is not balanced';
  end if;

  return v_transaction_id;
exception when others then
  raise;
end;
$function$;

CREATE OR REPLACE FUNCTION public.treasury_assert_transaction_balanced(p_transaction_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.treasury_asset_kind_for_currency(p_currency text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'pg_catalog'
AS $function$
  select case upper(trim(p_currency))
    when 'FRESH' then 'fresh-coin'
    when 'BTC' then 'crypto'
    when 'ETH' then 'crypto'
    when 'USDT' then 'crypto'
    when 'USDC' then 'crypto'
    else 'fiat'
  end;
$function$;

CREATE OR REPLACE FUNCTION public.treasury_ensure_platform_settlement_account(p_asset_code text, p_asset_kind text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_id uuid;
  v_code text := upper(trim(p_asset_code));
begin
  if v_code !~ '^[A-Z0-9_]{2,24}$' then
    raise exception 'Invalid asset code';
  end if;
  if p_asset_kind not in ('fiat', 'crypto', 'fresh-coin', 'token') then
    raise exception 'Invalid asset kind';
  end if;

  select id into v_id
  from public.treasury_accounts
  where scope = 'platform'
    and kind = 'liability'
    and asset_code = v_code
    and active
  limit 1;

  if v_id is not null then
    return v_id;
  end if;

  insert into public.treasury_accounts(
    owner_id, scope, kind, asset_code, asset_kind, display_name, active
  ) values (
    null, 'platform', 'liability', v_code, p_asset_kind,
    'External settlement clearing · ' || v_code, true
  )
  returning id into v_id;

  return v_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.treasury_ensure_user_account(p_actor_id uuid, p_asset_code text, p_asset_kind text, p_display_name text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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

CREATE OR REPLACE FUNCTION public.treasury_resolve_recipient(p_actor_id uuid, p_username text, p_asset_code text DEFAULT 'FRESH'::text)
 RETURNS TABLE(account_id uuid, display_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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

CREATE OR REPLACE FUNCTION public.treasury_create_rail_request(p_actor_id uuid, p_direction text, p_method_id text, p_family text, p_amount_minor bigint, p_currency_code text, p_instrument_id uuid DEFAULT NULL::uuid, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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

CREATE OR REPLACE FUNCTION public.treasury_sandbox_settle_rail_request(p_actor_id uuid, p_request_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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

CREATE OR REPLACE FUNCTION public.treasury_create_and_sandbox_settle_rail_request(p_actor_id uuid, p_direction text, p_method_id text, p_family text, p_amount_minor bigint, p_currency_code text, p_instrument_id uuid DEFAULT NULL::uuid, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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

-- Foreign keys: added only when missing; skipped (with a notice) if a referenced table does not exist yet.
do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('treasury_accounts', 'treasury_accounts_owner_id_fkey', 'FOREIGN KEY (owner_id) REFERENCES auth.users(id)'),
      ('treasury_entries', 'treasury_entries_account_id_fkey', 'FOREIGN KEY (account_id) REFERENCES public.treasury_accounts(id) ON DELETE RESTRICT'),
      ('treasury_entries', 'treasury_entries_transaction_id_fkey', 'FOREIGN KEY (transaction_id) REFERENCES public.treasury_transactions(id) ON DELETE RESTRICT'),
      ('treasury_payment_instruments', 'treasury_payment_instruments_user_id_fkey', 'FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'),
      ('treasury_rail_requests', 'treasury_rail_requests_instrument_id_fkey', 'FOREIGN KEY (instrument_id) REFERENCES public.treasury_payment_instruments(id) ON DELETE SET NULL'),
      ('treasury_rail_requests', 'treasury_rail_requests_ledger_transaction_id_fkey', 'FOREIGN KEY (ledger_transaction_id) REFERENCES public.treasury_transactions(id) ON DELETE SET NULL'),
      ('treasury_rail_requests', 'treasury_rail_requests_user_id_fkey', 'FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE RESTRICT'),
      ('treasury_transactions', 'treasury_transactions_created_by_fkey', 'FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE RESTRICT')
    ) as v(tbl, conname, def)
  loop
    if to_regclass('public.' || quote_ident(r.tbl)) is null then continue; end if;
    if exists (select 1 from pg_constraint where conname = r.conname and conrelid = to_regclass('public.' || quote_ident(r.tbl))) then continue; end if;
    begin
      execute format('alter table public.%I add constraint %I %s', r.tbl, r.conname, r.def);
    exception when undefined_table or undefined_column then
      raise notice 'skipped foreign key %: referenced object missing', r.conname;
    end;
  end loop;
end
$$;

CREATE UNIQUE INDEX IF NOT EXISTS treasury_accounts_active_asset_uq ON public.treasury_accounts USING btree (owner_id, scope, kind, asset_code, asset_kind) WHERE active;
CREATE INDEX IF NOT EXISTS treasury_accounts_owner_idx ON public.treasury_accounts USING btree (owner_id);
CREATE UNIQUE INDEX IF NOT EXISTS treasury_user_asset_unique ON public.treasury_accounts USING btree (owner_id, asset_code, asset_kind) WHERE ((scope = 'user'::treasury_scope) AND (kind = 'asset'::ledger_account_kind));
CREATE INDEX IF NOT EXISTS idx_treasury_transactions_created_by ON public.treasury_transactions USING btree (created_by);
CREATE INDEX IF NOT EXISTS treasury_entries_account_idx ON public.treasury_entries USING btree (account_id, created_at);
CREATE INDEX IF NOT EXISTS treasury_entries_transaction_idx ON public.treasury_entries USING btree (transaction_id);
CREATE INDEX IF NOT EXISTS treasury_payment_instruments_user_idx ON public.treasury_payment_instruments USING btree (user_id, active);
CREATE INDEX IF NOT EXISTS treasury_rail_requests_instrument_id_idx ON public.treasury_rail_requests USING btree (instrument_id);
CREATE INDEX IF NOT EXISTS treasury_rail_requests_ledger_transaction_id_idx ON public.treasury_rail_requests USING btree (ledger_transaction_id);
CREATE INDEX IF NOT EXISTS treasury_rail_requests_status_idx ON public.treasury_rail_requests USING btree (status) WHERE (status = ANY (ARRAY['pending'::text, 'awaiting_user'::text, 'processing'::text]));
CREATE INDEX IF NOT EXISTS treasury_rail_requests_user_idx ON public.treasury_rail_requests USING btree (user_id, created_at DESC);

alter table public.treasury_accounts enable row level security;
alter table public.treasury_transactions enable row level security;
alter table public.treasury_entries enable row level security;
alter table public.treasury_payment_instruments enable row level security;
alter table public.treasury_rail_requests enable row level security;

drop policy if exists "treasury_accounts_select_own" on public.treasury_accounts;
create policy "treasury_accounts_select_own" on public.treasury_accounts for select to authenticated
  using ((scope = 'user'::treasury_scope) AND (owner_id = auth.uid()));

drop policy if exists "treasury_accounts_user_select" on public.treasury_accounts;
create policy "treasury_accounts_user_select" on public.treasury_accounts for select to authenticated
  using ((scope = 'user'::treasury_scope) AND (owner_id = auth.uid()));

drop policy if exists "treasury_transactions_select_own" on public.treasury_transactions;
create policy "treasury_transactions_select_own" on public.treasury_transactions for select to authenticated
  using (EXISTS ( SELECT 1 FROM (treasury_entries e JOIN treasury_accounts a ON ((a.id = e.account_id))) WHERE ((e.transaction_id = treasury_transactions.id) AND (a.scope = 'user'::treasury_scope) AND (a.owner_id = auth.uid()))));

drop policy if exists "treasury_entries_select_own" on public.treasury_entries;
create policy "treasury_entries_select_own" on public.treasury_entries for select to authenticated
  using (EXISTS ( SELECT 1 FROM treasury_accounts a WHERE ((a.id = treasury_entries.account_id) AND (a.scope = 'user'::treasury_scope) AND (a.owner_id = auth.uid()))));

drop policy if exists "treasury_payment_instruments_delete_own" on public.treasury_payment_instruments;
create policy "treasury_payment_instruments_delete_own" on public.treasury_payment_instruments for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists "treasury_payment_instruments_insert_own" on public.treasury_payment_instruments;
create policy "treasury_payment_instruments_insert_own" on public.treasury_payment_instruments for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "treasury_payment_instruments_select_own" on public.treasury_payment_instruments;
create policy "treasury_payment_instruments_select_own" on public.treasury_payment_instruments for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "treasury_payment_instruments_update_own" on public.treasury_payment_instruments;
create policy "treasury_payment_instruments_update_own" on public.treasury_payment_instruments for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "treasury_rail_requests_insert_own" on public.treasury_rail_requests;
create policy "treasury_rail_requests_insert_own" on public.treasury_rail_requests for insert to authenticated
  with check ((user_id = auth.uid()) AND (status = 'pending'::text) AND (ledger_transaction_id IS NULL));

drop policy if exists "treasury_rail_requests_select_own" on public.treasury_rail_requests;
create policy "treasury_rail_requests_select_own" on public.treasury_rail_requests for select to authenticated
  using (user_id = auth.uid());

create or replace view public.treasury_account_balances with (security_invoker = true) as
 SELECT a.id AS account_id,
    a.owner_id,
    a.scope,
    a.kind,
    a.asset_code,
    a.asset_kind,
    COALESCE(sum(
        CASE
            WHEN (a.kind = ANY (ARRAY['asset'::ledger_account_kind, 'expense'::ledger_account_kind])) AND e.direction = 'debit'::text THEN e.amount_minor
            WHEN (a.kind = ANY (ARRAY['asset'::ledger_account_kind, 'expense'::ledger_account_kind])) AND e.direction = 'credit'::text THEN - e.amount_minor
            WHEN (a.kind = ANY (ARRAY['liability'::ledger_account_kind, 'revenue'::ledger_account_kind, 'equity'::ledger_account_kind])) AND e.direction = 'credit'::text THEN e.amount_minor
            WHEN (a.kind = ANY (ARRAY['liability'::ledger_account_kind, 'revenue'::ledger_account_kind, 'equity'::ledger_account_kind])) AND e.direction = 'debit'::text THEN - e.amount_minor
            ELSE 0::bigint
        END), 0::numeric)::bigint AS balance_minor
   FROM treasury_accounts a
     LEFT JOIN treasury_entries e ON e.account_id = a.id
  WHERE a.active
  GROUP BY a.id, a.owner_id, a.scope, a.kind, a.asset_code, a.asset_kind;

create or replace view public.my_treasury_balances with (security_invoker = true) as
 SELECT account_id,
    asset_code,
    asset_kind,
    balance_minor
   FROM treasury_account_balances
  WHERE scope = 'user'::treasury_scope AND owner_id = auth.uid();

create or replace view public.treasury_my_balances with (security_invoker = true) as
 SELECT b.account_id,
    b.asset_code,
    b.asset_kind,
    a.display_name,
    b.balance_minor
   FROM treasury_account_balances b
     JOIN treasury_accounts a ON a.id = b.account_id
  WHERE b.scope = 'user'::treasury_scope AND b.owner_id = auth.uid() AND a.active;

create or replace view public.treasury_my_transactions with (security_invoker = true) as
 SELECT t.id AS transaction_id,
    t.reference,
    t.description,
    t.created_at,
    e.account_id,
    e.direction,
    e.amount_minor,
    a.asset_code,
    a.asset_kind
   FROM treasury_transactions t
     JOIN treasury_entries e ON e.transaction_id = t.id
     JOIN treasury_accounts a ON a.id = e.account_id
  WHERE a.scope = 'user'::treasury_scope AND a.owner_id = auth.uid()
  ORDER BY t.created_at DESC;

do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('treasury_accounts', 'authenticated', 'references,select,trigger,truncate'),
      ('treasury_entries', 'authenticated', 'select'),
      ('treasury_rail_requests', 'authenticated', 'insert,references,select,trigger,truncate'),
      ('treasury_transactions', 'authenticated', 'select')
    ) as v(tbl, grantee, keep)
  loop
    if to_regclass('public.' || quote_ident(r.tbl)) is null then continue; end if;
    execute format('revoke all on table public.%I from %I', r.tbl, r.grantee);
    if r.keep <> '' then
      execute format('grant %s on table public.%I to %I', r.keep, r.tbl, r.grantee);
    end if;
  end loop;
end
$$;
