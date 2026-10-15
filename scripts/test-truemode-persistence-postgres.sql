-- Run only against the ephemeral CI PostgreSQL database.
do $test$
declare
  payload jsonb := jsonb_build_object(
    'entities', jsonb_build_array(jsonb_build_object('id','ci-entity-1','entity_type','concept','label','CI test entity','attributes','[]'::jsonb)),
    'sources', jsonb_build_array(jsonb_build_object('id','ci-source-1','provider','ci','name','CI source','url','https://example.test/ci','reliability',0.9,'metadata','{}'::jsonb)),
    'claims', jsonb_build_array(jsonb_build_object('id','ci-claim-1','subject_entity_id','ci-entity-1','predicate','supports','object','{"value":"test"}'::jsonb,'normalized_text','CI test claim','status','supported','confidence',0.9)),
    'evidence', jsonb_build_array(jsonb_build_object('id','ci-evidence-1','claim_text','CI test evidence','source_id','ci-source-1','source_url','https://example.test/ci','source_title','CI source','provider','ci','confidence',0.9,'supports',true)),
    'claim_evidence', jsonb_build_array(jsonb_build_object('claim_id','ci-claim-1','evidence_id','ci-evidence-1','stance','supports','stance_confidence',0.9)),
    'relations', '[]'::jsonb,
    'arbitrations', '[]'::jsonb,
    'truth_decisions', jsonb_build_array(jsonb_build_object('claim_id','ci-claim-1','decision','ALLOW_ACTION','actionable',true,'calibrated_confidence',0.9,'temporal_status','current','reasons','[]'::jsonb,'assessed_at',now()))
  );
  first_result jsonb;
  retry_result jsonb;
  bad_payload jsonb;
begin
  first_result := public.persist_fresh_intelligence_research_graph('ci-truemode-batch-1', payload);
  if first_result->>'persisted' <> 'true' or first_result->>'alreadyPersisted' <> 'false' then
    raise exception 'Expected first call to persist: %', first_result;
  end if;
  if (first_result#>>'{summary,entities}')::int <> 1
     or (first_result#>>'{summary,sources}')::int <> 1
     or (first_result#>>'{summary,claims}')::int <> 1
     or (first_result#>>'{summary,evidence}')::int <> 1
     or (first_result#>>'{summary,claimEvidence}')::int <> 1
     or (first_result#>>'{summary,truthDecisions}')::int <> 1 then
    raise exception 'Unexpected persisted summary: %', first_result->'summary';
  end if;

  if not exists (select 1 from public.fresh_intelligence_claims where id='ci-claim-1' and subject_entity_id='ci-entity-1')
     or not exists (select 1 from public.fresh_intelligence_evidence where id='ci-evidence-1' and source_id='ci-source-1')
     or not exists (select 1 from public.fresh_intelligence_claim_evidence where claim_id='ci-claim-1' and evidence_id='ci-evidence-1')
     or not exists (select 1 from public.fresh_intelligence_truth_decisions where claim_id='ci-claim-1' and decision='ALLOW_ACTION') then
    raise exception 'Read-back failed for persisted claim/evidence/decision graph';
  end if;

  retry_result := public.persist_fresh_intelligence_research_graph('ci-truemode-batch-1', '{"entities":[],"sources":[],"claims":[],"evidence":[]}'::jsonb);
  if retry_result->>'persisted' <> 'false' or retry_result->>'alreadyPersisted' <> 'true'
     or retry_result->'summary' <> first_result->'summary' then
    raise exception 'Retry was not idempotent: %', retry_result;
  end if;
  if (select count(*) from public.fresh_intelligence_claims where id='ci-claim-1') <> 1 then
    raise exception 'Idempotent retry duplicated claims';
  end if;

  bad_payload := jsonb_set(payload, '{claims,0,subject_entity_id}', '"missing-entity"');
  begin
    perform public.persist_fresh_intelligence_research_graph('ci-truemode-rollback-batch', bad_payload);
    raise exception 'Expected invalid foreign key to fail';
  exception when foreign_key_violation then
    null;
  end;
  if exists (select 1 from public.fresh_intelligence_persistence_batches where batch_key='ci-truemode-rollback-batch')
     or exists (select 1 from public.fresh_intelligence_claims where id='ci-claim-1-rollback') then
    raise exception 'Failed batch was partially persisted; rollback did not hold';
  end if;

  begin
    perform public.persist_fresh_intelligence_research_graph('ci-truemode-invalid-payload', '{"entities":{}}'::jsonb);
    raise exception 'Expected malformed collection to fail';
  exception when raise_exception then
    if sqlerrm not like 'Research persistence collections must be JSON arrays' then raise; end if;
  end;

  raise notice 'TRUEMODE real PostgreSQL persistence integration: PASS (first write, read-back, idempotent retry, FK rollback, malformed payload)';
end;
$test$;
