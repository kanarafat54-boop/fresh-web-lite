-- Fresh Knowledge Graph v1: multilingual identity and entity-to-entity relations.
-- This migration is server-managed and keeps provenance attached to graph facts.

create table if not exists public.fresh_knowledge_entity_aliases (
  entity_id text not null references public.fresh_intelligence_entities(id) on delete cascade,
  alias text not null,
  language text,
  script text,
  source_id text references public.fresh_intelligence_sources(id) on delete set null,
  observed_at timestamptz not null default now(),
  primary key (entity_id, alias, language)
);

create table if not exists public.fresh_knowledge_entity_relations (
  id uuid primary key default gen_random_uuid(),
  from_entity_id text not null references public.fresh_intelligence_entities(id) on delete cascade,
  relation text not null,
  to_entity_id text not null references public.fresh_intelligence_entities(id) on delete cascade,
  claim_id text references public.fresh_intelligence_claims(id) on delete set null,
  source_id text references public.fresh_intelligence_sources(id) on delete set null,
  confidence numeric(5,4) not null default 0 check (confidence >= 0 and confidence <= 1),
  observed_at timestamptz not null default now(),
  provenance jsonb not null default '{}'::jsonb,
  unique(from_entity_id, relation, to_entity_id, claim_id)
);

create index if not exists idx_fkg_aliases_alias on public.fresh_knowledge_entity_aliases(alias);
create index if not exists idx_fkg_relations_from on public.fresh_knowledge_entity_relations(from_entity_id, relation);
create index if not exists idx_fkg_relations_to on public.fresh_knowledge_entity_relations(to_entity_id, relation);
create index if not exists idx_fkg_relations_claim on public.fresh_knowledge_entity_relations(claim_id);

alter table public.fresh_knowledge_entity_aliases enable row level security;
alter table public.fresh_knowledge_entity_relations enable row level security;

-- No direct client policies: graph writes remain behind trusted server execution.
