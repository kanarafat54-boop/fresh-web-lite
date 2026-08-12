-- Fresh Intelligence semantic graph persistence.
-- Append-only evidence/assessment history; current claims are materialized separately.

create extension if not exists pgcrypto;

create table if not exists public.fresh_intelligence_entities (
  id text primary key,
  entity_type text not null,
  label text not null,
  attributes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fresh_intelligence_sources (
  id text primary key,
  provider text not null,
  name text,
  url text,
  reliability numeric(5,4),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.fresh_intelligence_claims (
  id text primary key,
  subject_entity_id text references public.fresh_intelligence_entities(id) on delete set null,
  predicate text not null,
  object jsonb not null,
  normalized_text text not null,
  status text not null check (status in ('supported','contested','uncertain','unsubstantiated')),
  confidence numeric(5,4) not null default 0 check (confidence >= 0 and confidence <= 1),
  first_observed_at timestamptz not null,
  last_observed_at timestamptz not null,
  valid_from timestamptz,
  valid_to timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fresh_intelligence_evidence (
  id text primary key,
  claim_text text not null,
  source_id text references public.fresh_intelligence_sources(id) on delete set null,
  source_url text not null,
  source_title text,
  provider text not null,
  observed_at timestamptz not null,
  published_at timestamptz,
  confidence numeric(5,4) check (confidence >= 0 and confidence <= 1),
  supports boolean,
  created_at timestamptz not null default now()
);

create table if not exists public.fresh_intelligence_claim_evidence (
  claim_id text not null references public.fresh_intelligence_claims(id) on delete cascade,
  evidence_id text not null references public.fresh_intelligence_evidence(id) on delete cascade,
  stance text not null check (stance in ('supports','contradicts','uncertain')),
  stance_confidence numeric(5,4) check (stance_confidence >= 0 and stance_confidence <= 1),
  created_at timestamptz not null default now(),
  primary key (claim_id, evidence_id)
);

create table if not exists public.fresh_intelligence_claim_relations (
  id uuid primary key default gen_random_uuid(),
  left_claim_id text not null references public.fresh_intelligence_claims(id) on delete cascade,
  right_claim_id text not null references public.fresh_intelligence_claims(id) on delete cascade,
  relation text not null check (relation in ('same','supports','contradicts','unrelated','conditional_contradiction')),
  confidence numeric(5,4) not null default 0 check (confidence >= 0 and confidence <= 1),
  rationale text,
  observed_at timestamptz not null default now(),
  unique(left_claim_id, right_claim_id, relation)
);

create table if not exists public.fresh_intelligence_arbitrations (
  id uuid primary key default gen_random_uuid(),
  left_claim_id text not null references public.fresh_intelligence_claims(id) on delete cascade,
  right_claim_id text not null references public.fresh_intelligence_claims(id) on delete cascade,
  decision text not null check (decision in ('merge','preserve_both','downgrade','disputed','supersede','defer')),
  confidence numeric(5,4) not null default 0 check (confidence >= 0 and confidence <= 1),
  rationale text not null,
  requires_human_review boolean not null default false,
  retained_claim_ids text[] not null default '{}',
  superseded_claim_ids text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.fresh_intelligence_claim_revisions (
  id uuid primary key default gen_random_uuid(),
  claim_id text not null references public.fresh_intelligence_claims(id) on delete cascade,
  previous_status text,
  next_status text not null,
  previous_confidence numeric(5,4),
  next_confidence numeric(5,4),
  reason text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_fi_claims_entity on public.fresh_intelligence_claims(subject_entity_id);
create index if not exists idx_fi_claims_validity on public.fresh_intelligence_claims(valid_from, valid_to);
create index if not exists idx_fi_claims_status on public.fresh_intelligence_claims(status);
create index if not exists idx_fi_evidence_source on public.fresh_intelligence_evidence(source_id);
create index if not exists idx_fi_evidence_observed on public.fresh_intelligence_evidence(observed_at desc);
create index if not exists idx_fi_claim_evidence_claim on public.fresh_intelligence_claim_evidence(claim_id);
create index if not exists idx_fi_relations_claims on public.fresh_intelligence_claim_relations(left_claim_id, right_claim_id);
create index if not exists idx_fi_arbitrations_review on public.fresh_intelligence_arbitrations(requires_human_review, created_at desc);
create index if not exists idx_fi_revisions_claim on public.fresh_intelligence_claim_revisions(claim_id, created_at desc);

alter table public.fresh_intelligence_entities enable row level security;
alter table public.fresh_intelligence_sources enable row level security;
alter table public.fresh_intelligence_claims enable row level security;
alter table public.fresh_intelligence_evidence enable row level security;
alter table public.fresh_intelligence_claim_evidence enable row level security;
alter table public.fresh_intelligence_claim_relations enable row level security;
alter table public.fresh_intelligence_arbitrations enable row level security;
alter table public.fresh_intelligence_claim_revisions enable row level security;

-- Intelligence data is server-managed. No direct client policies are created here.
-- Service-role/server-side execution can write these tables while RLS remains enabled.
