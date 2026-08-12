create table if not exists public.fresh_intelligence_evidence_lineage (
  from_evidence_id text not null references public.fresh_intelligence_evidence(id) on delete cascade,
  to_evidence_id text references public.fresh_intelligence_evidence(id) on delete cascade,
  source_id text references public.fresh_intelligence_sources(id) on delete set null,
  relation text not null check (relation in ('published_by','reports','likely_copies','possibly_copies','same_origin','supports','contradicts')),
  score numeric(5,4) not null default 0 check (score >= 0 and score <= 1),
  created_at timestamptz not null default now(),
  primary key (from_evidence_id, to_evidence_id, relation)
);

create index if not exists idx_fi_lineage_from on public.fresh_intelligence_evidence_lineage(from_evidence_id);
create index if not exists idx_fi_lineage_to on public.fresh_intelligence_evidence_lineage(to_evidence_id);
create index if not exists idx_fi_lineage_relation on public.fresh_intelligence_evidence_lineage(relation);

alter table public.fresh_intelligence_evidence_lineage enable row level security;
