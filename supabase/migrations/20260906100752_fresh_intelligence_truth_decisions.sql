create table if not exists public.fresh_intelligence_truth_decisions (
  id uuid primary key default gen_random_uuid(),
  claim_id text not null references public.fresh_intelligence_claims(id) on delete cascade,
  decision text not null check (decision in ('ALLOW_ACTION','ALLOW_WITH_CAUTION','BLOCK_ACTION')),
  actionable boolean not null,
  calibrated_confidence numeric not null check (calibrated_confidence >= 0 and calibrated_confidence <= 1),
  temporal_status text not null,
  reasons jsonb not null default '[]'::jsonb,
  assessed_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists fresh_intelligence_truth_decisions_claim_id_idx
  on public.fresh_intelligence_truth_decisions (claim_id);
create index if not exists fresh_intelligence_truth_decisions_assessed_at_idx
  on public.fresh_intelligence_truth_decisions (assessed_at desc);

alter table public.fresh_intelligence_truth_decisions enable row level security;
