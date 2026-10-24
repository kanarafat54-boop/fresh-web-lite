-- Restored from production schema (20260906072645): performance indexes (idx_*), reconstructed from production catalogs.
-- The original SQL was never committed. Each index is created only if its table and columns exist; idempotent.
do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('CREATE INDEX IF NOT EXISTS idx_direct_messages_sender_id ON public.direct_messages USING btree (sender_id)'),
      ('CREATE INDEX IF NOT EXISTS idx_fresh_ai_improvement_proposals_created_by ON public.fresh_ai_improvement_proposals USING btree (created_by)'),
      ('CREATE INDEX IF NOT EXISTS idx_fresh_ai_pipeline_events_user_id ON public.fresh_ai_pipeline_events USING btree (user_id)'),
      ('CREATE INDEX IF NOT EXISTS idx_fresh_ai_safety_events_user_id ON public.fresh_ai_safety_events USING btree (user_id)'),
      ('CREATE INDEX IF NOT EXISTS idx_fresh_ai_serving_metrics_user_id ON public.fresh_ai_serving_metrics USING btree (user_id)'),
      ('CREATE INDEX IF NOT EXISTS idx_fi_arbitrations_review ON public.fresh_intelligence_arbitrations USING btree (requires_human_review, created_at DESC)'),
      ('CREATE INDEX IF NOT EXISTS idx_fi_claim_evidence_claim ON public.fresh_intelligence_claim_evidence USING btree (claim_id)'),
      ('CREATE INDEX IF NOT EXISTS idx_fi_relations_claims ON public.fresh_intelligence_claim_relations USING btree (left_claim_id, right_claim_id)'),
      ('CREATE INDEX IF NOT EXISTS idx_fi_revisions_claim ON public.fresh_intelligence_claim_revisions USING btree (claim_id, created_at DESC)'),
      ('CREATE INDEX IF NOT EXISTS idx_fi_claims_entity ON public.fresh_intelligence_claims USING btree (subject_entity_id)'),
      ('CREATE INDEX IF NOT EXISTS idx_fi_claims_status ON public.fresh_intelligence_claims USING btree (status)'),
      ('CREATE INDEX IF NOT EXISTS idx_fi_claims_validity ON public.fresh_intelligence_claims USING btree (valid_from, valid_to)'),
      ('CREATE INDEX IF NOT EXISTS idx_fi_evidence_observed ON public.fresh_intelligence_evidence USING btree (observed_at DESC)'),
      ('CREATE INDEX IF NOT EXISTS idx_fi_evidence_source ON public.fresh_intelligence_evidence USING btree (source_id)'),
      ('CREATE INDEX IF NOT EXISTS idx_fi_lineage_from ON public.fresh_intelligence_evidence_lineage USING btree (from_evidence_id)'),
      ('CREATE INDEX IF NOT EXISTS idx_fi_lineage_relation ON public.fresh_intelligence_evidence_lineage USING btree (relation)'),
      ('CREATE INDEX IF NOT EXISTS idx_fi_lineage_to ON public.fresh_intelligence_evidence_lineage USING btree (to_evidence_id)'),
      ('CREATE INDEX IF NOT EXISTS idx_fresh_intelligence_evidence_lineage_source_id ON public.fresh_intelligence_evidence_lineage USING btree (source_id)'),
      ('CREATE INDEX IF NOT EXISTS idx_fkg_aliases_alias ON public.fresh_knowledge_entity_aliases USING btree (alias)'),
      ('CREATE INDEX IF NOT EXISTS idx_fresh_knowledge_entity_aliases_source_id ON public.fresh_knowledge_entity_aliases USING btree (source_id)'),
      ('CREATE INDEX IF NOT EXISTS idx_fkg_relations_claim ON public.fresh_knowledge_entity_relations USING btree (claim_id)'),
      ('CREATE INDEX IF NOT EXISTS idx_fkg_relations_from ON public.fresh_knowledge_entity_relations USING btree (from_entity_id, relation)'),
      ('CREATE INDEX IF NOT EXISTS idx_fkg_relations_to ON public.fresh_knowledge_entity_relations USING btree (to_entity_id, relation)'),
      ('CREATE INDEX IF NOT EXISTS idx_fresh_knowledge_entity_relations_source_id ON public.fresh_knowledge_entity_relations USING btree (source_id)'),
      ('CREATE INDEX IF NOT EXISTS idx_short_captions_created_by ON public.short_captions USING btree (created_by)'),
      ('CREATE INDEX IF NOT EXISTS idx_short_gifts_recipient_id ON public.short_gifts USING btree (recipient_id)'),
      ('CREATE INDEX IF NOT EXISTS idx_short_gifts_sender_id ON public.short_gifts USING btree (sender_id)'),
      ('CREATE INDEX IF NOT EXISTS idx_short_gifts_transaction_id ON public.short_gifts USING btree (transaction_id)'),
      ('CREATE INDEX IF NOT EXISTS idx_treasury_transactions_created_by ON public.treasury_transactions USING btree (created_by)')
    ) as v(def)
  loop
    begin
      execute r.def;
    exception when undefined_table or undefined_column then
      raise notice 'skipped index: %', r.def;
    end;
  end loop;
end
$$;
