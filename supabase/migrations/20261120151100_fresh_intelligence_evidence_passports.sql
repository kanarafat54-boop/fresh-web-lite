-- Immutable, independently addressable snapshots of captured research evidence.
create table if not exists public.fresh_intelligence_evidence_passports (
  passport_id text primary key,
  source_id text not null references public.fresh_intelligence_sources(id) on delete restrict,
  version text not null,
  issuer text not null,
  source_url text not null check (source_url ~ '^https?://'),
  source_title text not null,
  publisher_domain text not null,
  retrieval_provider text not null,
  published_at timestamptz,
  observed_at timestamptz not null,
  issued_at timestamptz not null,
  captured_kind text not null check (captured_kind in ('publisher_excerpt', 'title_only')),
  captured_text text not null,
  digest_algorithm text not null check (digest_algorithm = 'SHA-256'),
  content_digest text not null check (content_digest ~ '^[a-f0-9]{64}$'),
  verification jsonb not null default '{}'::jsonb check (jsonb_typeof(verification) = 'object'),
  limitations jsonb not null default '[]'::jsonb check (jsonb_typeof(limitations) = 'array'),
  created_at timestamptz not null default now()
);

create index if not exists fresh_intelligence_evidence_passports_source_observed_idx
  on public.fresh_intelligence_evidence_passports(source_id, observed_at desc);

alter table public.fresh_intelligence_evidence_passports enable row level security;
revoke all on table public.fresh_intelligence_evidence_passports from public, anon, authenticated;
grant all on table public.fresh_intelligence_evidence_passports to service_role;

-- The wrapper keeps graph rows and their immutable passports in one transaction.
-- Retrying the same graph batch can still insert any missing passport rows safely.
create or replace function public.persist_fresh_intelligence_research_graph_with_passports(
  p_batch_key text,
  p_payload jsonb,
  p_passports jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_graph_result jsonb;
  v_inserted integer := 0;
begin
  if p_passports is null or jsonb_typeof(p_passports) <> 'array' then
    raise exception 'Evidence passports must be a JSON array';
  end if;

  v_graph_result := public.persist_fresh_intelligence_research_graph(p_batch_key, p_payload);

  insert into public.fresh_intelligence_evidence_passports(
    passport_id, source_id, version, issuer, source_url, source_title,
    publisher_domain, retrieval_provider, published_at, observed_at, issued_at,
    captured_kind, captured_text, digest_algorithm, content_digest, verification, limitations
  )
  select
    p.passport_id, p.source_id, p.version, p.issuer, p.source_url, p.source_title,
    p.publisher_domain, p.retrieval_provider, p.published_at, p.observed_at, p.issued_at,
    p.captured_kind, p.captured_text, p.digest_algorithm, p.content_digest,
    coalesce(p.verification, '{}'::jsonb), coalesce(p.limitations, '[]'::jsonb)
  from jsonb_to_recordset(p_passports) as p(
    passport_id text, source_id text, version text, issuer text, source_url text,
    source_title text, publisher_domain text, retrieval_provider text,
    published_at timestamptz, observed_at timestamptz, issued_at timestamptz,
    captured_kind text, captured_text text, digest_algorithm text, content_digest text,
    verification jsonb, limitations jsonb
  )
  on conflict (passport_id) do nothing;

  get diagnostics v_inserted = row_count;
  return v_graph_result || jsonb_build_object('passportsPersisted', v_inserted);
end;
$function$;

revoke all on function public.persist_fresh_intelligence_research_graph_with_passports(text, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.persist_fresh_intelligence_research_graph_with_passports(text, jsonb, jsonb) to service_role;

create or replace function public.reject_fresh_evidence_passport_mutation()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  raise exception 'Fresh Evidence Passports are append-only records';
end;
$function$;

drop trigger if exists fresh_intelligence_evidence_passports_immutable on public.fresh_intelligence_evidence_passports;
create trigger fresh_intelligence_evidence_passports_immutable
before update or delete on public.fresh_intelligence_evidence_passports
for each row execute function public.reject_fresh_evidence_passport_mutation();

revoke all on function public.reject_fresh_evidence_passport_mutation() from public, anon, authenticated;
notify pgrst, 'reload schema';
