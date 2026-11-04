-- Restored from production schema (20260827041726): immutable double-entry ledger
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

create table if not exists public.ledger_transactions (
  id uuid default gen_random_uuid() not null,
  reference text not null,
  created_by uuid,
  description text not null,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  idempotency_key text,
  constraint ledger_transactions_pkey PRIMARY KEY (id),
  constraint ledger_transactions_reference_key UNIQUE (reference)
);

-- Bring a pre-existing, older-shaped table up to the production column set (no-ops where present).
alter table public.ledger_transactions add column if not exists id uuid default gen_random_uuid() not null;
alter table public.ledger_transactions add column if not exists reference text not null;
alter table public.ledger_transactions add column if not exists created_by uuid;
alter table public.ledger_transactions add column if not exists description text not null;
alter table public.ledger_transactions add column if not exists metadata jsonb default '{}'::jsonb not null;
alter table public.ledger_transactions add column if not exists created_at timestamp with time zone default now() not null;
alter table public.ledger_transactions add column if not exists idempotency_key text;

create table if not exists public.ledger_entries (
  id uuid default gen_random_uuid() not null,
  transaction_id uuid not null,
  account_id uuid not null,
  amount_minor bigint not null,
  direction text not null,
  created_at timestamp with time zone default now() not null,
  constraint ledger_entries_amount_minor_check CHECK ((amount_minor > 0)),
  constraint ledger_entries_direction_check CHECK ((direction = ANY (ARRAY['debit'::text, 'credit'::text]))),
  constraint ledger_entries_pkey PRIMARY KEY (id)
);

-- Bring a pre-existing, older-shaped table up to the production column set (no-ops where present).
alter table public.ledger_entries add column if not exists id uuid default gen_random_uuid() not null;
alter table public.ledger_entries add column if not exists transaction_id uuid not null;
alter table public.ledger_entries add column if not exists account_id uuid not null;
alter table public.ledger_entries add column if not exists amount_minor bigint not null;
alter table public.ledger_entries add column if not exists direction text not null;
alter table public.ledger_entries add column if not exists created_at timestamp with time zone default now() not null;

CREATE OR REPLACE FUNCTION public.assert_ledger_transaction_balanced(p_transaction_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.reject_ledger_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  raise exception 'Ledger records are immutable';
end;
$function$;

-- Foreign keys: added only when missing; skipped (with a notice) if a referenced table does not exist yet.
do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('ledger_entries', 'ledger_entries_account_id_fkey', 'FOREIGN KEY (account_id) REFERENCES public.treasury_accounts(id)'),
      ('ledger_entries', 'ledger_entries_transaction_id_fkey', 'FOREIGN KEY (transaction_id) REFERENCES public.ledger_transactions(id)'),
      ('ledger_transactions', 'ledger_transactions_created_by_fkey', 'FOREIGN KEY (created_by) REFERENCES auth.users(id)')
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

CREATE INDEX IF NOT EXISTS ledger_transactions_created_by_idx ON public.ledger_transactions USING btree (created_by);
CREATE UNIQUE INDEX IF NOT EXISTS ledger_transactions_idempotency_key_uq ON public.ledger_transactions USING btree (idempotency_key) WHERE (idempotency_key IS NOT NULL);
CREATE INDEX IF NOT EXISTS ledger_entries_account_idx ON public.ledger_entries USING btree (account_id);
CREATE INDEX IF NOT EXISTS ledger_entries_transaction_idx ON public.ledger_entries USING btree (transaction_id);

alter table public.ledger_transactions enable row level security;
alter table public.ledger_entries enable row level security;

drop trigger if exists ledger_transactions_immutable on public.ledger_transactions;
create trigger ledger_transactions_immutable BEFORE DELETE OR UPDATE ON public.ledger_transactions FOR EACH ROW EXECUTE FUNCTION public.reject_ledger_mutation();

drop trigger if exists ledger_entries_immutable on public.ledger_entries;
create trigger ledger_entries_immutable BEFORE DELETE OR UPDATE ON public.ledger_entries FOR EACH ROW EXECUTE FUNCTION public.reject_ledger_mutation();

do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('ledger_entries', 'anon', ''),
      ('ledger_entries', 'authenticated', ''),
      ('ledger_transactions', 'anon', ''),
      ('ledger_transactions', 'authenticated', '')
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
