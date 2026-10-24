-- Restored from production schema (20260902055048): short gifts and gift totals view
-- The original SQL for this version was never committed (placeholder). This file reconstructs the effective
-- end-state of the objects it introduced, from production catalogs read on 2026-10-23/24. Production has
-- already applied this version, so it will not re-run there. Everything below is idempotent.
-- Reconstruction note: statement-level history is not recoverable; final definitions are used.

create table if not exists public.short_gifts (
  id uuid default gen_random_uuid() not null,
  short_id uuid not null,
  sender_id uuid not null,
  recipient_id uuid not null,
  amount_minor bigint not null,
  transaction_id uuid not null,
  created_at timestamp with time zone default now() not null,
  constraint short_gifts_amount_minor_check CHECK ((amount_minor > 0)),
  constraint short_gifts_pkey PRIMARY KEY (id)
);

-- Bring a pre-existing, older-shaped table up to the production column set (no-ops where present).
alter table public.short_gifts add column if not exists id uuid default gen_random_uuid() not null;
alter table public.short_gifts add column if not exists short_id uuid not null;
alter table public.short_gifts add column if not exists sender_id uuid not null;
alter table public.short_gifts add column if not exists recipient_id uuid not null;
alter table public.short_gifts add column if not exists amount_minor bigint not null;
alter table public.short_gifts add column if not exists transaction_id uuid not null;
alter table public.short_gifts add column if not exists created_at timestamp with time zone default now() not null;

-- Foreign keys: added only when missing; skipped (with a notice) if a referenced table does not exist yet.
do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('short_gifts', 'short_gifts_recipient_id_fkey', 'FOREIGN KEY (recipient_id) REFERENCES auth.users(id) ON DELETE RESTRICT'),
      ('short_gifts', 'short_gifts_sender_id_fkey', 'FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE RESTRICT'),
      ('short_gifts', 'short_gifts_short_id_fkey', 'FOREIGN KEY (short_id) REFERENCES public.shorts(id) ON DELETE CASCADE'),
      ('short_gifts', 'short_gifts_transaction_id_fkey', 'FOREIGN KEY (transaction_id) REFERENCES public.ledger_transactions(id) ON DELETE RESTRICT')
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

CREATE INDEX IF NOT EXISTS idx_short_gifts_recipient_id ON public.short_gifts USING btree (recipient_id);
CREATE INDEX IF NOT EXISTS idx_short_gifts_sender_id ON public.short_gifts USING btree (sender_id);
CREATE INDEX IF NOT EXISTS idx_short_gifts_transaction_id ON public.short_gifts USING btree (transaction_id);
CREATE INDEX IF NOT EXISTS short_gifts_short_idx ON public.short_gifts USING btree (short_id);

alter table public.short_gifts enable row level security;

drop policy if exists "short gifts public read" on public.short_gifts;
create policy "short gifts public read" on public.short_gifts for select to authenticated
  using (true);

drop policy if exists "short gifts sender insert" on public.short_gifts;
create policy "short gifts sender insert" on public.short_gifts for insert to authenticated
  with check (auth.uid() = sender_id);

create or replace view public.short_gift_totals with (security_invoker = true) as
 SELECT short_id,
    count(*) AS gift_count,
    COALESCE(sum(amount_minor), 0::numeric)::bigint AS total_minor
   FROM short_gifts
  GROUP BY short_id;

do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('short_gifts', 'authenticated', 'insert,references,select,trigger,truncate')
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
