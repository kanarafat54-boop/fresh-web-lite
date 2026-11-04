-- Restored from production schema (20260812125640): Fresh Intelligence tables that no later repo migration defines (arbitrations, claim revisions). The other intelligence tables are defined by 20260906090000_fresh_intelligence_foundation.sql, whose statements assume an older shape, so they are intentionally not restored here
-- The original SQL for this version was never committed (placeholder). This file reconstructs the effective
-- end-state of the objects it introduced, from production catalogs read on 2026-10-23/24. Production has
-- already applied this version, so it will not re-run there. Everything below is idempotent.
-- Reconstruction note: statement-level history is not recoverable; final definitions are used.

create table if not exists public.fresh_intelligence_arbitrations (
  id uuid default gen_random_uuid() not null,
  left_claim_id text not null,
  right_claim_id text not null,
  decision text not null,
  confidence numeric(5,4) default 0 not null,
  rationale text not null,
  requires_human_review boolean default false not null,
  retained_claim_ids text[] default '{}'::text[] not null,
  superseded_claim_ids text[] default '{}'::text[] not null,
  created_at timestamp with time zone default now() not null,
  constraint fresh_intelligence_arbitrations_confidence_check CHECK (((confidence >= (0)::numeric) AND (confidence <= (1)::numeric))),
  constraint fresh_intelligence_arbitrations_decision_check CHECK ((decision = ANY (ARRAY['merge'::text, 'preserve_both'::text, 'downgrade'::text, 'disputed'::text, 'supersede'::text, 'defer'::text]))),
  constraint fresh_intelligence_arbitrations_pkey PRIMARY KEY (id)
);

-- Bring a pre-existing, older-shaped table up to the production column set (no-ops where present).
alter table public.fresh_intelligence_arbitrations add column if not exists id uuid default gen_random_uuid() not null;
alter table public.fresh_intelligence_arbitrations add column if not exists left_claim_id text not null;
alter table public.fresh_intelligence_arbitrations add column if not exists right_claim_id text not null;
alter table public.fresh_intelligence_arbitrations add column if not exists decision text not null;
alter table public.fresh_intelligence_arbitrations add column if not exists confidence numeric(5,4) default 0 not null;
alter table public.fresh_intelligence_arbitrations add column if not exists rationale text not null;
alter table public.fresh_intelligence_arbitrations add column if not exists requires_human_review boolean default false not null;
alter table public.fresh_intelligence_arbitrations add column if not exists retained_claim_ids text[] default '{}'::text[] not null;
alter table public.fresh_intelligence_arbitrations add column if not exists superseded_claim_ids text[] default '{}'::text[] not null;
alter table public.fresh_intelligence_arbitrations add column if not exists created_at timestamp with time zone default now() not null;

create table if not exists public.fresh_intelligence_claim_revisions (
  id uuid default gen_random_uuid() not null,
  claim_id text not null,
  previous_status text,
  next_status text not null,
  previous_confidence numeric(5,4),
  next_confidence numeric(5,4),
  reason text not null,
  created_at timestamp with time zone default now() not null,
  constraint fresh_intelligence_claim_revisions_pkey PRIMARY KEY (id)
);

-- Bring a pre-existing, older-shaped table up to the production column set (no-ops where present).
alter table public.fresh_intelligence_claim_revisions add column if not exists id uuid default gen_random_uuid() not null;
alter table public.fresh_intelligence_claim_revisions add column if not exists claim_id text not null;
alter table public.fresh_intelligence_claim_revisions add column if not exists previous_status text;
alter table public.fresh_intelligence_claim_revisions add column if not exists next_status text not null;
alter table public.fresh_intelligence_claim_revisions add column if not exists previous_confidence numeric(5,4);
alter table public.fresh_intelligence_claim_revisions add column if not exists next_confidence numeric(5,4);
alter table public.fresh_intelligence_claim_revisions add column if not exists reason text not null;
alter table public.fresh_intelligence_claim_revisions add column if not exists created_at timestamp with time zone default now() not null;

-- Foreign keys: added only when missing; skipped (with a notice) if a referenced table does not exist yet.
do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('fresh_intelligence_arbitrations', 'fresh_intelligence_arbitrations_left_claim_id_fkey', 'FOREIGN KEY (left_claim_id) REFERENCES public.fresh_intelligence_claims(id) ON DELETE CASCADE'),
      ('fresh_intelligence_arbitrations', 'fresh_intelligence_arbitrations_right_claim_id_fkey', 'FOREIGN KEY (right_claim_id) REFERENCES public.fresh_intelligence_claims(id) ON DELETE CASCADE'),
      ('fresh_intelligence_claim_revisions', 'fresh_intelligence_claim_revisions_claim_id_fkey', 'FOREIGN KEY (claim_id) REFERENCES public.fresh_intelligence_claims(id) ON DELETE CASCADE')
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

CREATE INDEX IF NOT EXISTS fresh_intelligence_arbitrations_left_idx ON public.fresh_intelligence_arbitrations USING btree (left_claim_id);
CREATE INDEX IF NOT EXISTS fresh_intelligence_arbitrations_right_idx ON public.fresh_intelligence_arbitrations USING btree (right_claim_id);
CREATE INDEX IF NOT EXISTS idx_fi_arbitrations_review ON public.fresh_intelligence_arbitrations USING btree (requires_human_review, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fi_revisions_claim ON public.fresh_intelligence_claim_revisions USING btree (claim_id, created_at DESC);

alter table public.fresh_intelligence_arbitrations enable row level security;
alter table public.fresh_intelligence_claim_revisions enable row level security;
