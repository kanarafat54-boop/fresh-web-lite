-- Persist a complete TRUEMODE research graph atomically and make retries idempotent.
create table if not exists public.fresh_intelligence_persistence_batches (
  batch_key text primary key,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.fresh_intelligence_persistence_batches enable row level security;
revoke all on table public.fresh_intelligence_persistence_batches from public, anon, authenticated;
grant all on table public.fresh_intelligence_persistence_batches to service_role;

create or replace function public.persist_fresh_intelligence_research_graph(p_batch_key text, p_payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_existing_summary jsonb;
  v_summary jsonb;
begin
  if p_batch_key is null or length(p_batch_key) < 1 or length(p_batch_key) > 300 then
    raise exception 'Invalid research persistence batch key';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Research persistence payload must be a JSON object';
  end if;
  if jsonb_typeof(coalesce(p_payload->'entities', '[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_payload->'sources', '[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_payload->'claims', '[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_payload->'evidence', '[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_payload->'claim_evidence', '[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_payload->'relations', '[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_payload->'arbitrations', '[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_payload->'truth_decisions', '[]'::jsonb)) <> 'array' then
    raise exception 'Research persistence collections must be JSON arrays';
  end if;

  insert into public.fresh_intelligence_persistence_batches(batch_key, summary)
  values (p_batch_key, '{}'::jsonb)
  on conflict (batch_key) do nothing;

  if not found then
    select b.summary into v_existing_summary
    from public.fresh_intelligence_persistence_batches as b
    where b.batch_key = p_batch_key;
    return jsonb_build_object('persisted', false, 'alreadyPersisted', true, 'summary', coalesce(v_existing_summary, '{}'::jsonb));
  end if;

  insert into public.fresh_intelligence_entities(id, entity_type, label, attributes, updated_at)
  select r.id, r.entity_type, r.label, coalesce(r.attributes, '[]'::jsonb), coalesce(r.updated_at, now())
  from jsonb_to_recordset(coalesce(p_payload->'entities', '[]'::jsonb))
    as r(id text, entity_type text, label text, attributes jsonb, updated_at timestamptz)
  on conflict (id) do update set entity_type = excluded.entity_type, label = excluded.label,
    attributes = excluded.attributes, updated_at = excluded.updated_at;

  insert into public.fresh_intelligence_sources(id, provider, name, url, reliability, metadata)
  select r.id, r.provider, r.name, r.url, r.reliability, coalesce(r.metadata, '{}'::jsonb)
  from jsonb_to_recordset(coalesce(p_payload->'sources', '[]'::jsonb))
    as r(id text, provider text, name text, url text, reliability numeric, metadata jsonb)
  on conflict (id) do update set provider = excluded.provider, name = excluded.name, url = excluded.url,
    reliability = excluded.reliability, metadata = excluded.metadata;

  insert into public.fresh_intelligence_claims(
    id, subject_entity_id, predicate, object, normalized_text, status, confidence,
    first_observed_at, last_observed_at, valid_from, valid_to, updated_at
  )
  select r.id, r.subject_entity_id, r.predicate, r.object, r.normalized_text, r.status, r.confidence,
    r.first_observed_at, r.last_observed_at, r.valid_from, r.valid_to, coalesce(r.updated_at, now())
  from jsonb_to_recordset(coalesce(p_payload->'claims', '[]'::jsonb))
    as r(id text, subject_entity_id text, predicate text, object jsonb, normalized_text text, status text,
      confidence numeric, first_observed_at timestamptz, last_observed_at timestamptz,
      valid_from timestamptz, valid_to timestamptz, updated_at timestamptz)
  on conflict (id) do update set subject_entity_id = excluded.subject_entity_id, predicate = excluded.predicate,
    object = excluded.object, normalized_text = excluded.normalized_text, status = excluded.status,
    confidence = excluded.confidence, first_observed_at = excluded.first_observed_at,
    last_observed_at = excluded.last_observed_at, valid_from = excluded.valid_from,
    valid_to = excluded.valid_to, updated_at = excluded.updated_at;

  insert into public.fresh_intelligence_evidence(
    id, claim_text, source_id, source_url, source_title, provider, observed_at, published_at, confidence, supports
  )
  select r.id, r.claim_text, r.source_id, r.source_url, r.source_title, r.provider, r.observed_at,
    r.published_at, r.confidence, r.supports
  from jsonb_to_recordset(coalesce(p_payload->'evidence', '[]'::jsonb))
    as r(id text, claim_text text, source_id text, source_url text, source_title text, provider text,
      observed_at timestamptz, published_at timestamptz, confidence numeric, supports boolean)
  on conflict (id) do update set claim_text = excluded.claim_text, source_id = excluded.source_id,
    source_url = excluded.source_url, source_title = excluded.source_title, provider = excluded.provider,
    observed_at = excluded.observed_at, published_at = excluded.published_at,
    confidence = excluded.confidence, supports = excluded.supports;

  insert into public.fresh_intelligence_claim_evidence(claim_id, evidence_id, stance, stance_confidence)
  select distinct on (r.claim_id, r.evidence_id) r.claim_id, r.evidence_id, r.stance, r.stance_confidence
  from jsonb_to_recordset(coalesce(p_payload->'claim_evidence', '[]'::jsonb))
    as r(claim_id text, evidence_id text, stance text, stance_confidence numeric)
  order by r.claim_id, r.evidence_id, r.stance_confidence desc nulls last
  on conflict (claim_id, evidence_id) do update set stance = excluded.stance, stance_confidence = excluded.stance_confidence;

  insert into public.fresh_intelligence_claim_relations(
    left_claim_id, right_claim_id, relation, confidence, rationale, observed_at
  )
  select distinct on (r.left_claim_id, r.right_claim_id, r.relation)
    r.left_claim_id, r.right_claim_id, r.relation, r.confidence, r.rationale, coalesce(r.observed_at, now())
  from jsonb_to_recordset(coalesce(p_payload->'relations', '[]'::jsonb))
    as r(left_claim_id text, right_claim_id text, relation text, confidence numeric, rationale text, observed_at timestamptz)
  order by r.left_claim_id, r.right_claim_id, r.relation, r.confidence desc
  on conflict (left_claim_id, right_claim_id, relation) do update set
    confidence = excluded.confidence, rationale = excluded.rationale, observed_at = excluded.observed_at;

  insert into public.fresh_intelligence_arbitrations(
    left_claim_id, right_claim_id, decision, confidence, rationale, requires_human_review,
    retained_claim_ids, superseded_claim_ids
  )
  select distinct on (r.left_claim_id, r.right_claim_id, r.decision)
    r.left_claim_id, r.right_claim_id, r.decision, r.confidence, r.rationale,
    coalesce(r.requires_human_review, false), coalesce(r.retained_claim_ids, '{}'::text[]),
    coalesce(r.superseded_claim_ids, '{}'::text[])
  from jsonb_to_recordset(coalesce(p_payload->'arbitrations', '[]'::jsonb))
    as r(left_claim_id text, right_claim_id text, decision text, confidence numeric, rationale text,
      requires_human_review boolean, retained_claim_ids text[], superseded_claim_ids text[])
  order by r.left_claim_id, r.right_claim_id, r.decision, r.confidence desc;

  insert into public.fresh_intelligence_truth_decisions(
    claim_id, decision, actionable, calibrated_confidence, temporal_status, reasons, assessed_at
  )
  select r.claim_id, r.decision, r.actionable, r.calibrated_confidence, r.temporal_status,
    coalesce(r.reasons, '[]'::jsonb), r.assessed_at
  from jsonb_to_recordset(coalesce(p_payload->'truth_decisions', '[]'::jsonb))
    as r(claim_id text, decision text, actionable boolean, calibrated_confidence numeric,
      temporal_status text, reasons jsonb, assessed_at timestamptz);

  v_summary := jsonb_build_object(
    'entities', jsonb_array_length(coalesce(p_payload->'entities', '[]'::jsonb)),
    'sources', jsonb_array_length(coalesce(p_payload->'sources', '[]'::jsonb)),
    'claims', jsonb_array_length(coalesce(p_payload->'claims', '[]'::jsonb)),
    'evidence', jsonb_array_length(coalesce(p_payload->'evidence', '[]'::jsonb)),
    'claimEvidence', jsonb_array_length(coalesce(p_payload->'claim_evidence', '[]'::jsonb)),
    'relations', jsonb_array_length(coalesce(p_payload->'relations', '[]'::jsonb)),
    'arbitrations', jsonb_array_length(coalesce(p_payload->'arbitrations', '[]'::jsonb)),
    'truthDecisions', jsonb_array_length(coalesce(p_payload->'truth_decisions', '[]'::jsonb))
  );
  update public.fresh_intelligence_persistence_batches set summary = v_summary where batch_key = p_batch_key;
  return jsonb_build_object('persisted', true, 'alreadyPersisted', false, 'summary', v_summary);
end;
$function$;

revoke all on function public.persist_fresh_intelligence_research_graph(text, jsonb) from public, anon, authenticated;
grant execute on function public.persist_fresh_intelligence_research_graph(text, jsonb) to service_role;
notify pgrst, 'reload schema';
