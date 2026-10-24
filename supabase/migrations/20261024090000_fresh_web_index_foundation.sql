-- Fresh web index foundation (Fresh Global Intelligence, slice 1).
--
-- Additive only: creates new server-managed tables for crawled public-web documents, their
-- current passages, version history and crawl jobs. Nothing existing is altered or dropped.
-- Reconciliation: documents optionally link to the existing public.fresh_intelligence_sources
-- row (intelligence_source_id) so evidence/claims keep using the existing Fresh Intelligence
-- persistence path instead of a competing copy.
-- Access model: RLS enabled, no client grants. Only the service role (server API) reads/writes,
-- matching the existing fresh_intelligence_evidence tables. Nothing here is user-owned data.

create table if not exists public.fresh_web_documents (
  id uuid primary key default gen_random_uuid(),
  canonical_url text not null unique,
  host text not null,
  title text not null default '',
  language text,
  published_at timestamptz,
  status text not null default 'indexed' check (status in ('indexed', 'removed')),
  current_version integer not null default 1 check (current_version >= 1),
  content_hash text not null,
  first_seen_at timestamptz not null default now(),
  last_fetched_at timestamptz not null default now(),
  removed_at timestamptz,
  intelligence_source_id text references public.fresh_intelligence_sources (id) on delete set null
);
create index if not exists fresh_web_documents_host_idx on public.fresh_web_documents (host);
create index if not exists fresh_web_documents_hash_idx on public.fresh_web_documents (content_hash);
create index if not exists fresh_web_documents_source_idx on public.fresh_web_documents (intelligence_source_id);

create table if not exists public.fresh_web_document_versions (
  document_id uuid not null references public.fresh_web_documents (id) on delete cascade,
  version integer not null,
  content_hash text not null,
  fetched_at timestamptz not null,
  etag text,
  last_modified text,
  primary key (document_id, version)
);

-- Passages of the CURRENT version only. 'simple' text-search config is language-neutral
-- (no stemming), so non-English pages are searchable; per-language configs are a later benchmark-driven step.
create table if not exists public.fresh_web_passages (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.fresh_web_documents (id) on delete cascade,
  version integer not null,
  ordinal integer not null,
  body text not null,
  search_vector tsvector generated always as (to_tsvector('simple'::regconfig, body)) stored,
  unique (document_id, version, ordinal)
);
create index if not exists fresh_web_passages_search_idx on public.fresh_web_passages using gin (search_vector);

create table if not exists public.fresh_web_crawl_jobs (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed', 'blocked')),
  attempts integer not null default 0 check (attempts >= 0),
  last_outcome text,
  last_error text,
  next_attempt_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists fresh_web_crawl_jobs_due_idx on public.fresh_web_crawl_jobs (status, next_attempt_at);

alter table public.fresh_web_documents enable row level security;
alter table public.fresh_web_document_versions enable row level security;
alter table public.fresh_web_passages enable row level security;
alter table public.fresh_web_crawl_jobs enable row level security;
revoke all on table public.fresh_web_documents, public.fresh_web_document_versions, public.fresh_web_passages, public.fresh_web_crawl_jobs from public, anon, authenticated;
grant all on table public.fresh_web_documents, public.fresh_web_document_versions, public.fresh_web_passages, public.fresh_web_crawl_jobs to service_role;

-- Ranked passage retrieval over live documents. Server-only (service role).
create or replace function public.search_fresh_web_passages(p_query text, p_limit integer default 10, p_language text default null)
returns table (document_id uuid, canonical_url text, title text, language text, published_at timestamptz,
               last_fetched_at timestamptz, content_hash text, passage_id uuid, ordinal integer, body text, rank real)
language sql stable security invoker set search_path to 'public'
as $function$
  select d.id, d.canonical_url, d.title, d.language, d.published_at, d.last_fetched_at, d.content_hash,
         p.id, p.ordinal, p.body, ts_rank_cd(p.search_vector, q.query) as rank
  from public.fresh_web_passages p
  join public.fresh_web_documents d on d.id = p.document_id and d.current_version = p.version
  cross join lateral (select websearch_to_tsquery('simple', left(p_query, 500)) as query) q
  where d.status = 'indexed'
    and p.search_vector @@ q.query
    and (p_language is null or d.language like lower(p_language) || '%')
  order by rank desc, d.canonical_url
  limit least(greatest(coalesce(p_limit, 10), 1), 50);
$function$;
revoke all on function public.search_fresh_web_passages(text, integer, text) from public, anon, authenticated;
grant execute on function public.search_fresh_web_passages(text, integer, text) to service_role;
