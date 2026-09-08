-- Fresh AI training, alignment, safety and serving data plane.
-- Stores datasets/signals and evaluation telemetry; it never mutates a
-- production model automatically.

create table if not exists public.fresh_ai_training_examples (
  id uuid primary key default gen_random_uuid(),
  example_type text not null check (example_type in ('next-token','instruction-response','safety','preference','evaluation')),
  input_text text not null,
  output_text text null,
  preferred_output text null,
  rejected_output text null,
  labels jsonb not null default '{}'::jsonb,
  source text not null,
  quality_score numeric(6,4) null,
  safety_score numeric(6,4) null,
  dataset_version text null,
  created_at timestamptz not null default now()
);
create index if not exists fresh_ai_training_examples_type_idx on public.fresh_ai_training_examples(example_type, created_at desc);

create table if not exists public.fresh_ai_preference_pairs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete set null,
  request_id uuid null,
  prompt text not null,
  preferred_output text not null,
  rejected_output text not null,
  rationale text null,
  label text not null default 'better' check (label in ('better','worse','tie')),
  safety_checked boolean not null default false,
  reward_signal numeric(6,4) null,
  created_at timestamptz not null default now()
);
create index if not exists fresh_ai_preference_pairs_user_idx on public.fresh_ai_preference_pairs(user_id, created_at desc);

create table if not exists public.fresh_ai_safety_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid null,
  user_id uuid null references auth.users(id) on delete set null,
  decision text not null check (decision in ('allow','refuse','clarify','escalate','approval-required')),
  reasons jsonb not null default '[]'::jsonb,
  policy_version text not null,
  human_review_required boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists fresh_ai_safety_events_request_idx on public.fresh_ai_safety_events(request_id, created_at desc);

create table if not exists public.fresh_ai_serving_metrics (
  id uuid primary key default gen_random_uuid(),
  request_id uuid null,
  user_id uuid null references auth.users(id) on delete set null,
  route text not null,
  latency_ms integer null,
  fallback_used boolean not null default false,
  provider text null,
  success boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists fresh_ai_serving_metrics_route_idx on public.fresh_ai_serving_metrics(route, created_at desc);

alter table public.fresh_ai_training_examples enable row level security;
alter table public.fresh_ai_preference_pairs enable row level security;
alter table public.fresh_ai_safety_events enable row level security;
alter table public.fresh_ai_serving_metrics enable row level security;

-- Training corpora and operational safety/serving telemetry are not client-writable.
-- Service-role backend jobs can write them; authenticated users can only see their own preference records.
drop policy if exists fresh_ai_preference_owner on public.fresh_ai_preference_pairs;
create policy fresh_ai_preference_owner on public.fresh_ai_preference_pairs for select using (auth.uid() = user_id);

notify pgrst, 'reload schema';
