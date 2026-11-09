do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'fresh_intelligence_claims'
      and column_name = 'subject_entity_id'
  ) then raise exception 'canonical claims.subject_entity_id column is missing'; end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'fresh_intelligence_claims'
      and column_name = 'normalized_text'
  ) then raise exception 'canonical claims.normalized_text column is missing'; end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'fresh_intelligence_claims'
      and column_name in ('source_id', 'entity_id', 'statement')
  ) then raise exception 'legacy claims columns were introduced into the canonical schema'; end if;

  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'idx_fi_claims_entity'
      and indexdef like '%(subject_entity_id)%'
  ) then raise exception 'canonical claims entity index is missing'; end if;

  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'idx_fi_evidence_source'
      and indexdef like '%(source_id)%'
  ) then raise exception 'evidence source index is missing'; end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.fresh_intelligence_claim_relations'::regclass
      and contype = 'u'
  ) then raise exception 'claim relation uniqueness constraint is missing'; end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.fresh_intelligence_arbitrations'::regclass
      and conname = 'fresh_intelligence_arbitrations_left_claim_id_fkey'
  ) then raise exception 'arbitration claim foreign key is missing'; end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.fresh_intelligence_claim_revisions'::regclass
      and conname = 'fresh_intelligence_claim_revisions_claim_id_fkey'
  ) then raise exception 'claim revision foreign key is missing'; end if;
end
$$;
