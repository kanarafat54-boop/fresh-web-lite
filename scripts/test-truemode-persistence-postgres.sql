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
  rollback_payload jsonb;
  bad_passport jsonb;
  passport_payload jsonb := jsonb_build_array(jsonb_build_object(
    'passport_id','FEP-CI-001','source_id','ci-source-1','version','1.0','issuer','Fresh Web Lite Research',
    'source_url','https://example.test/ci','source_title','CI source','publisher_domain','example.test','retrieval_provider','ci',
    'observed_at',now(),'issued_at',now(),'captured_kind','publisher_excerpt','captured_text','CI captured excerpt',
    'digest_algorithm','SHA-256','content_digest',repeat('a',64),'verification','{"recordStatus":"recorded"}'::jsonb,'limitations','["CI test record"]'::jsonb
  ));
  claim_passage_payload jsonb := jsonb_build_array(jsonb_build_object(
    'passage_id','ci-passage-1','claim_id','ci-claim-1','answer_statement_id','s1',
    'statement_text','CI test claim statement','statement_start',0,'statement_end',24,
    'passport_id','FEP-CI-001','source_id','ci-source-1','evidence_id','ci-evidence-1',
    'quote_text','CI captured excerpt','quote_start',0,'quote_end',19,
    'method','term-overlap-v1','match_score',0.85,'matched_terms',jsonb_build_array('ci','captured','excerpt'),'strength','strong'
  ));
begin
  first_result := public.persist_fresh_intelligence_research_graph_with_passages('ci-truemode-batch-1', payload, passport_payload, claim_passage_payload);
  if first_result->>'persisted' <> 'true' or first_result->>'alreadyPersisted' <> 'false' or first_result->>'passportsPersisted' <> '1' or first_result->>'claimPassagesPersisted' <> '1' then
    raise exception 'Expected first call to persist: %', first_result;
  end if;
  if (first_result#>>'{summary,entities}')::int <> 1
     or (first_result#>>'{summary,sources}')::int <> 1
     or (first_result#>>'{summary,claims}')::int <> 1
     or (first_result#>>'{summary,evidence}')::int <> 1
     or (first_result#>>'{summary,claimEvidence}')::int <> 1
     or (first_result#>>'{summary,truthDecisions}')::int <> 1
     or (first_result#>>'{summary,claimPassages}')::int <> 1 then
    raise exception 'Unexpected persisted summary: %', first_result->'summary';
  end if;

  if not exists (select 1 from public.fresh_intelligence_claims where id='ci-claim-1' and subject_entity_id='ci-entity-1')
     or not exists (select 1 from public.fresh_intelligence_evidence where id='ci-evidence-1' and source_id='ci-source-1')
     or not exists (select 1 from public.fresh_intelligence_claim_evidence where claim_id='ci-claim-1' and evidence_id='ci-evidence-1')
     or not exists (select 1 from public.fresh_intelligence_truth_decisions where claim_id='ci-claim-1' and decision='ALLOW_ACTION')
     or not exists (select 1 from public.fresh_intelligence_evidence_passports where passport_id='FEP-CI-001' and source_id='ci-source-1' and content_digest=repeat('a',64))
     or not exists (select 1 from public.fresh_intelligence_claim_passages where passage_id='ci-passage-1' and claim_id='ci-claim-1' and passport_id='FEP-CI-001' and quote_text='CI captured excerpt' and quote_start=0 and quote_end=19 and method='term-overlap-v1') then
    raise exception 'Read-back failed for persisted claim/evidence/decision graph';
  end if;

  begin
    update public.fresh_intelligence_evidence_passports set captured_text='tampered' where passport_id='FEP-CI-001';
    raise exception 'Expected immutable passport update to fail';
  exception when raise_exception then
    if sqlerrm not like 'Fresh Evidence Passports are append-only records' then raise; end if;
  end;
  if (select captured_text from public.fresh_intelligence_evidence_passports where passport_id='FEP-CI-001') <> 'CI captured excerpt' then
    raise exception 'Immutable passport content changed after rejected update';
  end if;

  retry_result := public.persist_fresh_intelligence_research_graph_with_passages('ci-truemode-batch-1', '{"entities":[],"sources":[],"claims":[],"evidence":[]}'::jsonb, passport_payload, '[]'::jsonb);
  if retry_result->>'persisted' <> 'false' or retry_result->>'alreadyPersisted' <> 'true' or retry_result->>'passportsPersisted' <> '0'
     or retry_result->'summary' <> first_result->'summary' then
    raise exception 'Retry was not idempotent: %', retry_result;
  end if;
  if (select count(*) from public.fresh_intelligence_claims where id='ci-claim-1') <> 1
     or (select count(*) from public.fresh_intelligence_evidence_passports where passport_id='FEP-CI-001') <> 1
     or (select count(*) from public.fresh_intelligence_claim_passages where passage_id='ci-passage-1') <> 1 then
    raise exception 'Idempotent retry duplicated graph or passport records';
  end if;

  rollback_payload := jsonb_build_object(
    'entities', jsonb_build_array(jsonb_build_object('id','ci-rollback-entity','entity_type','concept','label','Rollback entity')),
    'sources', jsonb_build_array(jsonb_build_object('id','ci-rollback-source','provider','ci','name','Rollback source','url','https://example.test/rollback')),
    'claims','[]'::jsonb,'evidence','[]'::jsonb,'claim_evidence','[]'::jsonb,'relations','[]'::jsonb,'arbitrations','[]'::jsonb,'truth_decisions','[]'::jsonb
  );
  bad_passport := jsonb_build_array(jsonb_build_object(
    'passport_id','FEP-ROLLBACK-001','source_id','missing-source','version','1.0','issuer','Fresh Web Lite Research',
    'source_url','https://example.test/missing','source_title','Missing source','publisher_domain','example.test','retrieval_provider','ci',
    'observed_at',now(),'issued_at',now(),'captured_kind','title_only','captured_text','Missing source',
    'digest_algorithm','SHA-256','content_digest',repeat('b',64),'verification','{}'::jsonb,'limitations','[]'::jsonb
  ));
  begin
    perform public.persist_fresh_intelligence_research_graph_with_passports('ci-passport-rollback-batch', rollback_payload, bad_passport);
    raise exception 'Expected passport foreign key to fail';
  exception when foreign_key_violation then
    null;
  end;
  if exists (select 1 from public.fresh_intelligence_persistence_batches where batch_key='ci-passport-rollback-batch')
     or exists (select 1 from public.fresh_intelligence_sources where id='ci-rollback-source')
     or exists (select 1 from public.fresh_intelligence_evidence_passports where passport_id='FEP-ROLLBACK-001') then
    raise exception 'Graph and passport writes did not roll back atomically';
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

  raise notice 'TRUEMODE real PostgreSQL persistence integration: PASS (graph, passport, exact passage write/read-back, idempotent retry, FK rollback, malformed payload)';
end;
$test$;
