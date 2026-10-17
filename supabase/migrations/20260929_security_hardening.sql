-- Fresh Web Lite security hardening applied to the production Supabase project on 2026-09-29.
-- Data is preserved; this migration only tightens exposed API privileges.
-- Some historical RPC signatures were later replaced; guard exact signatures so
-- a clean replay does not grant privileges to a different overload by accident.

revoke all on table public.fresh_ai_safety_events from anon, authenticated;
revoke all on table public.fresh_ai_serving_metrics from anon, authenticated;
revoke all on table public.fresh_ai_training_examples from anon, authenticated;
revoke all on table public.fresh_intelligence_evidence_lineage from anon, authenticated;
revoke all on table public.fresh_intelligence_truth_decisions from anon, authenticated;
revoke all on table public.fresh_intelligence_claim_evidence from anon, authenticated;
revoke all on table public.fresh_intelligence_truth_decisions from anon, authenticated;
revoke all on table public.fresh_knowledge_entity_aliases from anon, authenticated;
revoke all on table public.fresh_knowledge_entity_relations from anon, authenticated;
revoke all on table public.ledger_entries from anon, authenticated;
revoke all on table public.ledger_transactions from anon, authenticated;

revoke all on function public.ensure_default_ecosystem_profiles() from public, anon;
grant execute on function public.ensure_default_ecosystem_profiles() to authenticated;

revoke all on function public.treasury_create_and_sandbox_settle_rail_request(text,text,text,bigint,text,uuid,jsonb) from public, anon;
grant execute on function public.treasury_create_and_sandbox_settle_rail_request(text,text,text,bigint,text,uuid,jsonb) to authenticated;

revoke all on function public.treasury_create_rail_request(text,text,text,bigint,text,uuid,jsonb) from public, anon;
grant execute on function public.treasury_create_rail_request(text,text,text,bigint,text,uuid,jsonb) to authenticated;

revoke all on function public.treasury_ensure_platform_settlement_account(text,text) from public, anon, authenticated;

revoke all on function public.treasury_sandbox_settle_rail_request(uuid) from public, anon;
grant execute on function public.treasury_sandbox_settle_rail_request(uuid) to authenticated;

revoke all on function public.treasury_ensure_user_account(text,text,text) from public;
grant execute on function public.treasury_ensure_user_account(text,text,text) to authenticated;

revoke all on function public.treasury_resolve_recipient(text,text) from public;
grant execute on function public.treasury_resolve_recipient(text,text) to authenticated;

-- These signatures are legacy forms. Do not fail replay or accidentally grant
-- authenticated execution to a differently-shaped SECURITY DEFINER overload.
do $migration$
begin
  if to_regprocedure('public.treasury_resolve_recipient_by_id(uuid,text)') is not null then
    revoke all on function public.treasury_resolve_recipient_by_id(uuid,text) from public;
    grant execute on function public.treasury_resolve_recipient_by_id(uuid,text) to authenticated;
  end if;

  if to_regprocedure('public.treasury_transfer_internal(uuid,uuid,bigint,text,text)') is not null then
    revoke all on function public.treasury_transfer_internal(uuid,uuid,bigint,text,text) from public;
    grant execute on function public.treasury_transfer_internal(uuid,uuid,bigint,text,text) to authenticated;
  end if;
end
$migration$;

alter function public.treasury_asset_kind_for_currency(text) set search_path = pg_catalog;
