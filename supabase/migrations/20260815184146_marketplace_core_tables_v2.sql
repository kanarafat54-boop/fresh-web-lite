-- Restored from production schema (20260815184146): marketplace listings and purchases
-- The original SQL for this version was never committed (placeholder). This file reconstructs the effective
-- end-state of the objects it introduced, from production catalogs read on 2026-10-23/24. Production has
-- already applied this version, so it will not re-run there. Everything below is idempotent.
-- Reconstruction note: statement-level history is not recoverable; final definitions are used.

create table if not exists public.marketplace_listings (
  id uuid default gen_random_uuid() not null,
  creator_id uuid not null,
  title text not null,
  description text default ''::text not null,
  category text default 'other'::text not null,
  price_minor bigint default 0 not null,
  currency text default 'USD'::text not null,
  asset_type text default 'digital'::text not null,
  status text default 'draft'::text not null,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint marketplace_listings_currency_check CHECK (((length(currency) >= 3) AND (length(currency) <= 12))),
  constraint marketplace_listings_pkey PRIMARY KEY (id),
  constraint marketplace_listings_price_minor_check CHECK ((price_minor >= 0)),
  constraint marketplace_listings_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text]))),
  constraint marketplace_listings_title_check CHECK ((length(TRIM(BOTH FROM title)) > 0))
);

-- Bring a pre-existing, older-shaped table up to the production column set (no-ops where present).
alter table public.marketplace_listings add column if not exists id uuid default gen_random_uuid() not null;
alter table public.marketplace_listings add column if not exists creator_id uuid not null;
alter table public.marketplace_listings add column if not exists title text not null;
alter table public.marketplace_listings add column if not exists description text default ''::text not null;
alter table public.marketplace_listings add column if not exists category text default 'other'::text not null;
alter table public.marketplace_listings add column if not exists price_minor bigint default 0 not null;
alter table public.marketplace_listings add column if not exists currency text default 'USD'::text not null;
alter table public.marketplace_listings add column if not exists asset_type text default 'digital'::text not null;
alter table public.marketplace_listings add column if not exists status text default 'draft'::text not null;
alter table public.marketplace_listings add column if not exists metadata jsonb default '{}'::jsonb not null;
alter table public.marketplace_listings add column if not exists created_at timestamp with time zone default now() not null;
alter table public.marketplace_listings add column if not exists updated_at timestamp with time zone default now() not null;

create table if not exists public.marketplace_purchases (
  id uuid default gen_random_uuid() not null,
  listing_id uuid not null,
  buyer_id uuid not null,
  creator_id uuid not null,
  amount_minor bigint not null,
  currency text not null,
  status text default 'pending'::text not null,
  settlement_reference text,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  settled_at timestamp with time zone,
  constraint marketplace_purchases_amount_minor_check CHECK ((amount_minor >= 0)),
  constraint marketplace_purchases_pkey PRIMARY KEY (id),
  constraint marketplace_purchases_settlement_reference_key UNIQUE (settlement_reference),
  constraint marketplace_purchases_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'settled'::text, 'failed'::text, 'cancelled'::text])))
);

-- Bring a pre-existing, older-shaped table up to the production column set (no-ops where present).
alter table public.marketplace_purchases add column if not exists id uuid default gen_random_uuid() not null;
alter table public.marketplace_purchases add column if not exists listing_id uuid not null;
alter table public.marketplace_purchases add column if not exists buyer_id uuid not null;
alter table public.marketplace_purchases add column if not exists creator_id uuid not null;
alter table public.marketplace_purchases add column if not exists amount_minor bigint not null;
alter table public.marketplace_purchases add column if not exists currency text not null;
alter table public.marketplace_purchases add column if not exists status text default 'pending'::text not null;
alter table public.marketplace_purchases add column if not exists settlement_reference text;
alter table public.marketplace_purchases add column if not exists metadata jsonb default '{}'::jsonb not null;
alter table public.marketplace_purchases add column if not exists created_at timestamp with time zone default now() not null;
alter table public.marketplace_purchases add column if not exists settled_at timestamp with time zone;

-- Foreign keys: added only when missing; skipped (with a notice) if a referenced table does not exist yet.
do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('marketplace_listings', 'marketplace_listings_creator_id_fkey', 'FOREIGN KEY (creator_id) REFERENCES auth.users(id) ON DELETE RESTRICT'),
      ('marketplace_purchases', 'marketplace_purchases_buyer_id_fkey', 'FOREIGN KEY (buyer_id) REFERENCES auth.users(id) ON DELETE RESTRICT'),
      ('marketplace_purchases', 'marketplace_purchases_creator_id_fkey', 'FOREIGN KEY (creator_id) REFERENCES auth.users(id) ON DELETE RESTRICT'),
      ('marketplace_purchases', 'marketplace_purchases_listing_id_fkey', 'FOREIGN KEY (listing_id) REFERENCES public.marketplace_listings(id) ON DELETE RESTRICT')
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

CREATE INDEX IF NOT EXISTS marketplace_listings_creator_idx ON public.marketplace_listings USING btree (creator_id);
CREATE INDEX IF NOT EXISTS marketplace_listings_status_idx ON public.marketplace_listings USING btree (status);
CREATE INDEX IF NOT EXISTS marketplace_purchases_buyer_idx ON public.marketplace_purchases USING btree (buyer_id);
CREATE INDEX IF NOT EXISTS marketplace_purchases_creator_idx ON public.marketplace_purchases USING btree (creator_id);
CREATE UNIQUE INDEX IF NOT EXISTS marketplace_purchases_idempotency_idx ON public.marketplace_purchases USING btree (((metadata ->> 'idempotency_key'::text))) WHERE (metadata ? 'idempotency_key'::text);
CREATE INDEX IF NOT EXISTS marketplace_purchases_listing_idx ON public.marketplace_purchases USING btree (listing_id);

alter table public.marketplace_listings enable row level security;
alter table public.marketplace_purchases enable row level security;

drop policy if exists "marketplace_listings_creator_insert" on public.marketplace_listings;
create policy "marketplace_listings_creator_insert" on public.marketplace_listings for insert to authenticated
  with check (creator_id = auth.uid());

drop policy if exists "marketplace_listings_creator_read" on public.marketplace_listings;
create policy "marketplace_listings_creator_read" on public.marketplace_listings for select to authenticated
  using (creator_id = auth.uid());

drop policy if exists "marketplace_listings_creator_update" on public.marketplace_listings;
create policy "marketplace_listings_creator_update" on public.marketplace_listings for update to authenticated
  using (creator_id = auth.uid())
  with check (creator_id = auth.uid());

drop policy if exists "marketplace_listings_public_published_read" on public.marketplace_listings;
create policy "marketplace_listings_public_published_read" on public.marketplace_listings for select to anon,authenticated
  using (status = 'published'::text);

drop policy if exists "marketplace_purchases_buyer_read" on public.marketplace_purchases;
create policy "marketplace_purchases_buyer_read" on public.marketplace_purchases for select to authenticated
  using (buyer_id = auth.uid());

drop policy if exists "marketplace_purchases_creator_read" on public.marketplace_purchases;
create policy "marketplace_purchases_creator_read" on public.marketplace_purchases for select to authenticated
  using (creator_id = auth.uid());

do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('marketplace_purchases', 'anon', 'references,select,trigger,truncate'),
      ('marketplace_purchases', 'authenticated', 'references,select,trigger,truncate')
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
