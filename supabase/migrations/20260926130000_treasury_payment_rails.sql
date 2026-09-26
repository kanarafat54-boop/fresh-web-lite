-- Fresh Treasury: payment instruments and deposit/payout requests.
-- External rails are adapters. Ledger credits/debits only via controlled RPCs after settlement confirmation.

create table if not exists public.treasury_payment_instruments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  method_id text not null,
  family text not null check (family in (
    'mobile_money', 'bank_transfer', 'card', 'digital_wallet',
    'crypto_onchain', 'instant_rail', 'agent_cash', 'ussd_banking'
  )),
  label text not null check (length(trim(label)) > 0),
  -- Non-secret display fields only (masked account, last4, network). Secrets live with the processor.
  display_hint text,
  currency_code text not null check (currency_code = upper(currency_code)),
  metadata jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists treasury_payment_instruments_user_idx
  on public.treasury_payment_instruments(user_id, active);

alter table public.treasury_payment_instruments enable row level security;

drop policy if exists treasury_payment_instruments_select_own on public.treasury_payment_instruments;
create policy treasury_payment_instruments_select_own
  on public.treasury_payment_instruments for select to authenticated
  using (user_id = auth.uid());

drop policy if exists treasury_payment_instruments_insert_own on public.treasury_payment_instruments;
create policy treasury_payment_instruments_insert_own
  on public.treasury_payment_instruments for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists treasury_payment_instruments_update_own on public.treasury_payment_instruments;
create policy treasury_payment_instruments_update_own
  on public.treasury_payment_instruments for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists treasury_payment_instruments_delete_own on public.treasury_payment_instruments;
create policy treasury_payment_instruments_delete_own
  on public.treasury_payment_instruments for delete to authenticated
  using (user_id = auth.uid());

grant select, insert, update, delete on public.treasury_payment_instruments to authenticated;

-- Deposit / withdrawal requests. Status advances only when a settlement adapter or operator confirms.
create table if not exists public.treasury_rail_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  direction text not null check (direction in ('deposit', 'withdrawal')),
  method_id text not null,
  family text not null,
  amount_minor bigint not null check (amount_minor > 0),
  currency_code text not null check (currency_code = upper(currency_code)),
  instrument_id uuid references public.treasury_payment_instruments(id) on delete set null,
  status text not null default 'pending' check (status in (
    'pending', 'awaiting_user', 'processing', 'settled', 'failed', 'cancelled'
  )),
  external_reference text,
  failure_reason text,
  ledger_transaction_id uuid references public.treasury_transactions(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists treasury_rail_requests_user_idx
  on public.treasury_rail_requests(user_id, created_at desc);

create index if not exists treasury_rail_requests_status_idx
  on public.treasury_rail_requests(status)
  where status in ('pending', 'awaiting_user', 'processing');

alter table public.treasury_rail_requests enable row level security;

drop policy if exists treasury_rail_requests_select_own on public.treasury_rail_requests;
create policy treasury_rail_requests_select_own
  on public.treasury_rail_requests for select to authenticated
  using (user_id = auth.uid());

-- Users may create pending requests only; status/settlement updates are server-side.
drop policy if exists treasury_rail_requests_insert_own on public.treasury_rail_requests;
create policy treasury_rail_requests_insert_own
  on public.treasury_rail_requests for insert to authenticated
  with check (
    user_id = auth.uid()
    and status = 'pending'
    and ledger_transaction_id is null
  );

revoke update, delete on public.treasury_rail_requests from authenticated;
grant select, insert on public.treasury_rail_requests to authenticated;

-- Idempotent request creation from the wallet UI.
create or replace function public.treasury_create_rail_request(
  p_direction text,
  p_method_id text,
  p_family text,
  p_amount_minor bigint,
  p_currency_code text,
  p_instrument_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if p_direction not in ('deposit', 'withdrawal') then
    raise exception 'Invalid direction';
  end if;
  if p_amount_minor is null or p_amount_minor <= 0 then
    raise exception 'Amount must be positive';
  end if;
  if length(trim(coalesce(p_method_id, ''))) < 2 then
    raise exception 'Method required';
  end if;

  insert into public.treasury_rail_requests(
    user_id, direction, method_id, family, amount_minor, currency_code, instrument_id, status, metadata
  ) values (
    auth.uid(),
    p_direction,
    trim(p_method_id),
    trim(p_family),
    p_amount_minor,
    upper(trim(p_currency_code)),
    p_instrument_id,
    'pending',
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.treasury_create_rail_request(text, text, text, bigint, text, uuid, jsonb) from public;
grant execute on function public.treasury_create_rail_request(text, text, text, bigint, text, uuid, jsonb) to authenticated;

comment on table public.treasury_payment_instruments is 'User-saved payment endpoints (display metadata only; secrets stay with processors).';
comment on table public.treasury_rail_requests is 'Deposit and withdrawal intents; ledger movement only after settlement confirmation.';

notify pgrst, 'reload schema';
