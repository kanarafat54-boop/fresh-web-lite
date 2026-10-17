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

-- Restore claim-to-claim relation storage before the later observed_at
-- compatibility migration. The production catalog confirms these columns,
-- constraints, and the server-managed access boundary.
create table if not exists public.fresh_intelligence_claim_relations (
  id uuid primary key default gen_random_uuid(),
  left_claim_id text not null references public.fresh_intelligence_claims(id) on delete cascade,
  right_claim_id text not null references public.fresh_intelligence_claims(id) on delete cascade,
  relation text not null check (relation in ('same', 'supports', 'contradicts', 'unrelated', 'conditional_contradiction')),
  confidence numeric not null default 0 check (confidence >= 0 and confidence <= 1),
  rationale text,
  observed_at timestamptz not null default now()
);

create index if not exists fresh_intelligence_claim_relations_left_claim_id_idx
  on public.fresh_intelligence_claim_relations (left_claim_id);
create index if not exists fresh_intelligence_claim_relations_right_claim_id_idx
  on public.fresh_intelligence_claim_relations (right_claim_id);

alter table public.fresh_intelligence_claim_relations enable row level security;
revoke all on table public.fresh_intelligence_claim_relations from public, anon, authenticated;
grant all on table public.fresh_intelligence_claim_relations to service_role;

create index if not exists fresh_intelligence_claims_source_idx
  on public.fresh_intelligence_claims (source_id);
create index if not exists fresh_intelligence_claims_entity_idx
  on public.fresh_intelligence_claims (entity_id);

-- Restore evidence tables that existed in production but were absent from the
-- clean-replay migration history. These are server-managed; clients receive no
-- direct table privileges and RLS remains enabled as defense in depth.
create table if not exists public.fresh_intelligence_evidence (
  id text primary key,
  claim_text text not null,
  source_id text references public.fresh_intelligence_sources(id) on delete set null,
  source_url text not null,
  source_title text,
  provider text not null,
  observed_at timestamptz not null,
  published_at timestamptz,
  confidence numeric(5,4),
  supports boolean,
  created_at timestamptz not null default now()
);

create table if not exists public.fresh_intelligence_claim_evidence (
  claim_id text not null references public.fresh_intelligence_claims(id) on delete cascade,
  evidence_id text not null references public.fresh_intelligence_evidence(id) on delete cascade,
  stance text not null,
  stance_confidence numeric(5,4),
  created_at timestamptz not null default now(),
  primary key (claim_id, evidence_id)
);

create table if not exists public.fresh_intelligence_evidence_lineage (
  from_evidence_id text not null references public.fresh_intelligence_evidence(id) on delete cascade,
  to_evidence_id text not null references public.fresh_intelligence_evidence(id) on delete cascade,
  source_id text references public.fresh_intelligence_sources(id) on delete set null,
  relation text not null check (relation in ('published_by', 'reports', 'likely_copies', 'possibly_copies', 'same_origin', 'supports', 'contradicts')),
  score numeric(5,4) not null default 0 check (score >= 0 and score <= 1),
  created_at timestamptz not null default now(),
  primary key (from_evidence_id, to_evidence_id, relation)
);

create index if not exists idx_fi_lineage_from
  on public.fresh_intelligence_evidence_lineage(from_evidence_id);
create index if not exists idx_fi_lineage_to
  on public.fresh_intelligence_evidence_lineage(to_evidence_id);
create index if not exists idx_fi_lineage_relation
  on public.fresh_intelligence_evidence_lineage(relation);
create index if not exists fresh_intelligence_evidence_source_id_idx
  on public.fresh_intelligence_evidence(source_id);
create index if not exists fresh_intelligence_claim_evidence_evidence_id_idx
  on public.fresh_intelligence_claim_evidence(evidence_id);

alter table public.fresh_intelligence_evidence enable row level security;
alter table public.fresh_intelligence_claim_evidence enable row level security;
alter table public.fresh_intelligence_evidence_lineage enable row level security;
revoke all on table public.fresh_intelligence_evidence from public, anon, authenticated;
revoke all on table public.fresh_intelligence_claim_evidence from public, anon, authenticated;
revoke all on table public.fresh_intelligence_evidence_lineage from public, anon, authenticated;
grant all on table public.fresh_intelligence_evidence to service_role;
grant all on table public.fresh_intelligence_claim_evidence to service_role;
grant all on table public.fresh_intelligence_evidence_lineage to service_role;
