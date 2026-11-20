-- Persist the exact sentence-to-passage evidence produced by claimEvidence.ts.
-- Passage overlap is provenance, not a truth verdict; answer-statement claims remain uncertain.
create table if not exists public.fresh_intelligence_claim_passages (
  passage_id text primary key,
  batch_key text not null references public.fresh_intelligence_persistence_batches(batch_key) on delete cascade,
  claim_id text not null references public.fresh_intelligence_claims(id) on delete cascade,
  answer_statement_id text not null,
  statement_text text not null,
  statement_start integer not null check (statement_start >= 0),
  statement_end integer not null check (statement_end > statement_start),
  passport_id text not null references public.fresh_intelligence_evidence_passports(passport_id) on delete restrict,
  source_id text not null references public.fresh_intelligence_sources(id) on delete restrict,
  evidence_id text not null references public.fresh_intelligence_evidence(id) on delete restrict,
  quote_text text not null check (length(quote_text) > 0),
  quote_start integer not null check (quote_start >= 0),
  quote_end integer not null check (quote_end > quote_start),
  method text not null,
  match_score numeric(5,4) not null check (match_score >= 0 and match_score <= 1),
  matched_terms jsonb not null default '[]'::jsonb check (jsonb_typeof(matched_terms) = 'array'),
  strength text not null check (strength in ('strong', 'partial')),
  created_at timestamptz not null default now(),
  unique (claim_id, answer_statement_id, passport_id, quote_start, quote_end, method)
);

create index if not exists fresh_intelligence_claim_passages_claim_idx
  on public.fresh_intelligence_claim_passages(claim_id, created_at desc);
create index if not exists fresh_intelligence_claim_passages_passport_idx
  on public.fresh_intelligence_claim_passages(passport_id);
create index if not exists fresh_intelligence_claim_passages_batch_idx
  on public.fresh_intelligence_claim_passages(batch_key);

comment on column public.fresh_intelligence_claim_passages.statement_start is
  'Zero-based JavaScript UTF-16 code-unit offset into the synthesized answer.';
comment on column public.fresh_intelligence_claim_passages.statement_end is
  'Exclusive zero-based JavaScript UTF-16 code-unit offset into the synthesized answer.';
comment on column public.fresh_intelligence_claim_passages.quote_start is
  'Zero-based JavaScript UTF-16 code-unit offset into the immutable passport captured_text.';
comment on column public.fresh_intelligence_claim_passages.quote_end is
  'Exclusive zero-based JavaScript UTF-16 code-unit offset into the immutable passport captured_text.';

alter table public.fresh_intelligence_claim_passages enable row level security;
revoke all on table public.fresh_intelligence_claim_passages from public, anon, authenticated;
grant select, insert on table public.fresh_intelligence_claim_passages to service_role;

-- Four-argument wrapper preserves the existing graph + passport transaction and
-- appends exact passage links in the same database transaction. The three-argument
-- RPC remains available for older server builds during rollout.
create or replace function public.persist_fresh_intelligence_research_graph_with_passages(
  p_batch_key text,
  p_payload jsonb,
  p_passports jsonb,
  p_claim_passages jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_result jsonb;
  v_inserted integer := 0;
  v_total integer := 0;
begin
  if p_claim_passages is null or jsonb_typeof(p_claim_passages) <> 'array' then
    raise exception 'Claim passages must be a JSON array';
  end if;

  v_result := public.persist_fresh_intelligence_research_graph_with_passports(p_batch_key, p_payload, p_passports);

  insert into public.fresh_intelligence_claim_passages(
    passage_id, batch_key, claim_id, answer_statement_id, statement_text,
    statement_start, statement_end, passport_id, source_id, evidence_id,
    quote_text, quote_start, quote_end, method, match_score, matched_terms, strength
  )
  select r.passage_id, p_batch_key, r.claim_id, r.answer_statement_id, r.statement_text,
    r.statement_start, r.statement_end, r.passport_id, r.source_id, r.evidence_id,
    r.quote_text, r.quote_start, r.quote_end, r.method, r.match_score,
    coalesce(r.matched_terms, '[]'::jsonb), r.strength
  from jsonb_to_recordset(p_claim_passages) as r(
    passage_id text, claim_id text, answer_statement_id text, statement_text text,
    statement_start integer, statement_end integer, passport_id text, source_id text,
    evidence_id text, quote_text text, quote_start integer, quote_end integer,
    method text, match_score numeric, matched_terms jsonb, strength text
  )
  on conflict (passage_id) do nothing;

  get diagnostics v_inserted = row_count;
  select count(*)::integer into v_total
  from public.fresh_intelligence_claim_passages
  where batch_key = p_batch_key;

  return v_result
    || jsonb_build_object('claimPassagesPersisted', v_inserted)
    || jsonb_build_object(
      'summary',
      coalesce(v_result->'summary', '{}'::jsonb)
      || jsonb_build_object('claimPassages', v_total)
    );
end;
$function$;

revoke all on function public.persist_fresh_intelligence_research_graph_with_passages(text, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.persist_fresh_intelligence_research_graph_with_passages(text, jsonb, jsonb, jsonb) to service_role;
notify pgrst, 'reload schema';
