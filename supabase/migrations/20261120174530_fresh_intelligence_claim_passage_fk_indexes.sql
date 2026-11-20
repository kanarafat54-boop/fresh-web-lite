-- Cover both foreign keys from exact answer passages into the source/evidence ledgers.
-- These indexes support passage-to-source/evidence joins and parent-side delete checks.
create index if not exists fresh_intelligence_claim_passages_source_idx
  on public.fresh_intelligence_claim_passages (source_id);

create index if not exists fresh_intelligence_claim_passages_evidence_idx
  on public.fresh_intelligence_claim_passages (evidence_id);
