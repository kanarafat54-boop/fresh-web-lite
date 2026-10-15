-- Minimal isolated PostgreSQL schema matching the columns used by the TRUEMODE RPC.
-- This runs only in the ephemeral CI postgres service, never against Supabase production.
create extension if not exists pgcrypto;
do $$ begin
  create role anon nologin;
exception when duplicate_object then null; end $$;
do $$ begin
  create role authenticated nologin;
exception when duplicate_object then null; end $$;
do $$ begin
  create role service_role nologin;
exception when duplicate_object then null; end $$;

create table public.fresh_intelligence_entities (
  id text primary key, entity_type text, label text, attributes jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
create table public.fresh_intelligence_sources (
  id text primary key, provider text, name text, url text, reliability numeric,
  metadata jsonb not null default '{}'::jsonb
);
create table public.fresh_intelligence_claims (
  id text primary key,
  subject_entity_id text not null references public.fresh_intelligence_entities(id),
  predicate text not null, object jsonb, normalized_text text, status text, confidence numeric,
  first_observed_at timestamptz, last_observed_at timestamptz, valid_from timestamptz,
  valid_to timestamptz, updated_at timestamptz not null default now()
);
create table public.fresh_intelligence_evidence (
  id text primary key, claim_text text, source_id text references public.fresh_intelligence_sources(id),
  source_url text, source_title text, provider text, observed_at timestamptz, published_at timestamptz,
  confidence numeric, supports boolean
);
create table public.fresh_intelligence_claim_evidence (
  claim_id text not null references public.fresh_intelligence_claims(id),
  evidence_id text not null references public.fresh_intelligence_evidence(id),
  stance text, stance_confidence numeric, primary key (claim_id, evidence_id)
);
create table public.fresh_intelligence_claim_relations (
  left_claim_id text not null references public.fresh_intelligence_claims(id),
  right_claim_id text not null references public.fresh_intelligence_claims(id),
  relation text not null, confidence numeric, rationale text, observed_at timestamptz not null default now(),
  primary key (left_claim_id, right_claim_id, relation)
);
create table public.fresh_intelligence_arbitrations (
  left_claim_id text not null references public.fresh_intelligence_claims(id),
  right_claim_id text not null references public.fresh_intelligence_claims(id),
  decision text not null, confidence numeric, rationale text, requires_human_review boolean not null default false,
  retained_claim_ids text[] not null default '{}', superseded_claim_ids text[] not null default '{}'
);
create table public.fresh_intelligence_truth_decisions (
  id uuid primary key default gen_random_uuid(),
  claim_id text not null references public.fresh_intelligence_claims(id),
  decision text not null check (decision in ('ALLOW_ACTION','ALLOW_WITH_CAUTION','BLOCK_ACTION')),
  actionable boolean not null, calibrated_confidence numeric not null check (calibrated_confidence between 0 and 1),
  temporal_status text not null, reasons jsonb not null default '[]'::jsonb, assessed_at timestamptz not null
);
