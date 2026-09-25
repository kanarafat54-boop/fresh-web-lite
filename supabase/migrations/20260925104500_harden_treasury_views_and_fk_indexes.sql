-- Harden treasury views and add covering indexes for known foreign-key access paths.
-- Views retain their auth.uid() ownership predicates but now execute with the
-- querying user's permissions/RLS rather than the view owner's privileges.
alter view public.my_treasury_balances set (security_invoker = true);
alter view public.treasury_my_balances set (security_invoker = true);
alter view public.treasury_my_transactions set (security_invoker = true);

create index if not exists idx_fresh_ai_improvement_proposals_created_by
  on public.fresh_ai_improvement_proposals (created_by);
create index if not exists idx_fresh_ai_pipeline_events_user_id
  on public.fresh_ai_pipeline_events (user_id);
create index if not exists idx_fresh_ai_safety_events_user_id
  on public.fresh_ai_safety_events (user_id);
create index if not exists idx_fresh_ai_serving_metrics_user_id
  on public.fresh_ai_serving_metrics (user_id);
create index if not exists idx_fresh_intelligence_evidence_lineage_source_id
  on public.fresh_intelligence_evidence_lineage (source_id);
create index if not exists idx_fresh_knowledge_entity_aliases_source_id
  on public.fresh_knowledge_entity_aliases (source_id);
create index if not exists idx_fresh_knowledge_entity_relations_source_id
  on public.fresh_knowledge_entity_relations (source_id);
create index if not exists idx_treasury_transactions_created_by
  on public.treasury_transactions (created_by);
