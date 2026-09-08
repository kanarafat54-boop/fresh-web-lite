-- Fresh AI persistent cognitive fabric
-- Durable memory, semantic knowledge, multimodal artifacts, capabilities,
-- evaluation runs, and governed improvement proposals.

create table if not exists public.fresh_ai_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete cascade,
  project_id text null,
  scope text not null check (scope in ('user','project','platform','session')),
  content text not null,
  modality text not null default 'text',
  source text null,
  metadata jsonb not null default '{}'::jsonb,
  importance numeric(4,3) not null default 0.500,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists fresh_ai_memory_user_idx on public.fresh_ai_memory(user_id, scope, updated_at desc);
create index if not exists fresh_ai_memory_project_idx on public.fresh_ai_memory(project_id, updated_at desc);

create table if not exists public.fresh_ai_knowledge (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete cascade,
  project_id text null,
  title text not null,
  content text not null,
  modality text not null default 'text',
  source text null,
  provenance jsonb not null default '{}'::jsonb,
  truth_state text not null default 'UNCERTAIN' check (truth_state in ('KNOWN','PROBABLE','UNCERTAIN','CONTRADICTED','UNKNOWN','BLOCKED')),
  confidence numeric(4,3) not null default 0.500,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists fresh_ai_knowledge_user_idx on public.fresh_ai_knowledge(user_id, updated_at desc);

create table if not exists public.fresh_ai_capabilities (
  id uuid primary key default gen_random_uuid(),
  owner_scope text not null default 'platform',
  name text not null,
  version text not null default '1.0.0',
  description text not null,
  modality_support text[] not null default array['text'],
  risk_level text not null default 'low' check (risk_level in ('low','medium','high','critical')),
  enabled boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_scope,name,version)
);

create table if not exists public.fresh_ai_evaluations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid null,
  user_id uuid null references auth.users(id) on delete cascade,
  evaluator text not null,
  metric text not null,
  score numeric(6,4) not null,
  expected numeric(6,4) null,
  feedback text null,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists fresh_ai_evaluations_user_idx on public.fresh_ai_evaluations(user_id, created_at desc);
create index if not exists fresh_ai_evaluations_request_idx on public.fresh_ai_evaluations(request_id, created_at desc);

create table if not exists public.fresh_ai_improvement_proposals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  hypothesis text not null,
  target_capability text null,
  expected_gain numeric(6,4) null,
  risk_level text not null default 'low' check (risk_level in ('low','medium','high','critical')),
  reversible boolean not null default true,
  status text not null default 'proposed' check (status in ('proposed','approved','rejected','testing','rolled_back','adopted')),
  requires_approval boolean not null default true,
  evidence jsonb not null default '{}'::jsonb,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.fresh_ai_memory enable row level security;
alter table public.fresh_ai_knowledge enable row level security;
alter table public.fresh_ai_capabilities enable row level security;
alter table public.fresh_ai_evaluations enable row level security;
alter table public.fresh_ai_improvement_proposals enable row level security;

-- Users can access their own memory/knowledge/evaluation data.
drop policy if exists fresh_ai_memory_owner on public.fresh_ai_memory;
create policy fresh_ai_memory_owner on public.fresh_ai_memory for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists fresh_ai_knowledge_owner on public.fresh_ai_knowledge;
create policy fresh_ai_knowledge_owner on public.fresh_ai_knowledge for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists fresh_ai_evaluations_owner on public.fresh_ai_evaluations;
create policy fresh_ai_evaluations_owner on public.fresh_ai_evaluations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Capability definitions are readable by authenticated users but not mutable from the client.
drop policy if exists fresh_ai_capabilities_read on public.fresh_ai_capabilities;
create policy fresh_ai_capabilities_read on public.fresh_ai_capabilities for select using (auth.role() = 'authenticated');

-- Improvement proposals are private to their creator when created from a user context.
drop policy if exists fresh_ai_improvement_owner on public.fresh_ai_improvement_proposals;
create policy fresh_ai_improvement_owner on public.fresh_ai_improvement_proposals for select using (auth.uid() = created_by);

notify pgrst, 'reload schema';
