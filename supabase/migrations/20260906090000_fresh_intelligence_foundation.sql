-- Fresh Intelligence foundation tables.
-- Production already had these from remote history; Preview applies repo migrations from scratch.
-- claim_id is text to match fresh_intelligence_truth_decisions FK.

create table if not exists public.fresh_intelligence_sources (
  id text primary key,
  title text,
  url text,
  source_type text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.fresh_intelligence_entities (
  id text primary key,
  name text not null default '',
  entity_type text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.fresh_intelligence_claims (
  id text primary key,
  statement text not null default '',
  source_id text references public.fresh_intelligence_sources (id) on delete set null,
  entity_id text references public.fresh_intelligence_entities (id) on delete set null,
  confidence numeric,
  status text not null default 'open',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists fresh_intelligence_claims_source_idx
  on public.fresh_intelligence_claims (source_id);
create index if not exists fresh_intelligence_claims_entity_idx
  on public.fresh_intelligence_claims (entity_id);
