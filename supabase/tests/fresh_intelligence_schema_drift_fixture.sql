-- Simulate the canonical Fresh Intelligence tables already present in production.
-- This is isolated CI data only; it never connects to the user's Supabase project.
create extension if not exists pgcrypto;

do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin; exception when duplicate_object then null; end $$;

create table public.fresh_intelligence_sources (
  id text primary key,
  provider text not null,
  name text,
  url text,
  reliability numeric(5,4),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.fresh_intelligence_entities (
  id text primary key,
  entity_type text not null,
  label text not null,
  attributes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.fresh_intelligence_claims (
  id text primary key,
  subject_entity_id text references public.fresh_intelligence_entities(id) on delete set null,
  predicate text not null,
  object jsonb not null,
  normalized_text text not null,
  status text not null check (status in ('supported', 'contested', 'uncertain', 'unsubstantiated')),
  confidence numeric(5,4) not null default 0 check (confidence >= 0 and confidence <= 1),
  first_observed_at timestamptz not null,
  last_observed_at timestamptz not null,
  valid_from timestamptz,
  valid_to timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.fresh_intelligence_arbitrations (
  id uuid primary key default gen_random_uuid(),
  left_claim_id text not null,
  right_claim_id text not null,
  decision text not null,
  confidence numeric(5,4) not null default 0,
  rationale text not null,
  requires_human_review boolean not null default false,
  retained_claim_ids text[] not null default '{}',
  superseded_claim_ids text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.fresh_intelligence_claim_revisions (
  id uuid primary key default gen_random_uuid(),
  claim_id text not null,
  previous_status text,
  next_status text not null,
  previous_confidence numeric(5,4),
  next_confidence numeric(5,4),
  reason text not null,
  created_at timestamptz not null default now()
);

-- Reproduce the earlier migration's RLS state while leaving the claim FKs absent,
-- so the foundation migration must restore those missing constraints.
alter table public.fresh_intelligence_arbitrations enable row level security;
create policy "fresh intelligence arbitrations are readable" on public.fresh_intelligence_arbitrations
  for select to anon, authenticated using (true);
alter table public.fresh_intelligence_claim_revisions enable row level security;
create policy "fresh intelligence claim revisions are readable" on public.fresh_intelligence_claim_revisions
  for select to anon, authenticated using (true);
