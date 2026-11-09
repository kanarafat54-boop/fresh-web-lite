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

  if not exists (
    select 1 from pg_class
    where oid = 'public.fresh_intelligence_sources'::regclass and relrowsecurity
  ) then raise exception 'sources RLS is not enabled'; end if;
  if not exists (
    select 1 from pg_class
    where oid = 'public.fresh_intelligence_entities'::regclass and relrowsecurity
  ) then raise exception 'entities RLS is not enabled'; end if;
  if not exists (
    select 1 from pg_class
    where oid = 'public.fresh_intelligence_claims'::regclass and relrowsecurity
  ) then raise exception 'claims RLS is not enabled'; end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'fresh_intelligence_sources'
      and policyname = 'fresh intelligence sources are readable' and cmd = 'SELECT'
  ) then raise exception 'sources public-read policy is missing'; end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'fresh_intelligence_entities'
      and policyname = 'fresh intelligence entities are readable' and cmd = 'SELECT'
  ) then raise exception 'entities public-read policy is missing'; end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'fresh_intelligence_claims'
      and policyname = 'fresh intelligence claims are readable' and cmd = 'SELECT'
  ) then raise exception 'claims public-read policy is missing'; end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'fresh_intelligence_claim_relations'
      and policyname = 'fresh intelligence claim relations are readable' and cmd = 'SELECT'
  ) then raise exception 'claim relations public-read policy is missing'; end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'fresh_intelligence_evidence'
      and policyname = 'fresh intelligence evidence is readable' and cmd = 'SELECT'
  ) then raise exception 'evidence public-read policy is missing'; end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'fresh_intelligence_claim_evidence'
      and policyname = 'fresh intelligence claim evidence is readable' and cmd = 'SELECT'
  ) then raise exception 'claim evidence public-read policy is missing'; end if;

  if not exists (select 1 from pg_class where oid = 'public.fresh_intelligence_claim_relations'::regclass and relrowsecurity) then
    raise exception 'claim relations RLS is not enabled';
  end if;
  if not exists (select 1 from pg_class where oid = 'public.fresh_intelligence_evidence'::regclass and relrowsecurity) then
    raise exception 'evidence RLS is not enabled';
  end if;
  if not exists (select 1 from pg_class where oid = 'public.fresh_intelligence_claim_evidence'::regclass and relrowsecurity) then
    raise exception 'claim evidence RLS is not enabled';
  end if;
  if not exists (select 1 from pg_class where oid = 'public.fresh_intelligence_evidence_lineage'::regclass and relrowsecurity) then
    raise exception 'evidence lineage RLS is not enabled';
  end if;
  if not exists (select 1 from pg_class where oid = 'public.fresh_intelligence_arbitrations'::regclass and relrowsecurity) then
    raise exception 'arbitrations RLS is not enabled';
  end if;
  if not exists (select 1 from pg_class where oid = 'public.fresh_intelligence_claim_revisions'::regclass and relrowsecurity) then
    raise exception 'claim revisions RLS is not enabled';
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='fresh_intelligence_arbitrations' and policyname='fresh intelligence arbitrations are readable') then
    raise exception 'arbitrations public-read policy is missing';
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='fresh_intelligence_claim_revisions' and policyname='fresh intelligence claim revisions are readable') then
    raise exception 'claim revisions public-read policy is missing';
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='fresh_intelligence_evidence_lineage') then
    raise exception 'evidence lineage must remain internal-only';
  end if;

end
$;
