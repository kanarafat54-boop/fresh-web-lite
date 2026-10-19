-- Restore the server-managed Fresh AI training/evaluation example store for
-- clean migration replay. The production table was created in remote history,
-- but this repository's historical marker had been left as a no-op.
create table if not exists public.fresh_ai_training_examples (
  id uuid primary key default gen_random_uuid(),
  example_type text not null
    check (example_type in ('next-token', 'instruction-response', 'safety', 'preference', 'evaluation')),
  input_text text not null,
  output_text text,
  preferred_output text,
  rejected_output text,
  labels jsonb not null default '{}'::jsonb,
  source text not null,
  quality_score numeric,
  safety_score numeric,
  dataset_version text,
  created_at timestamptz not null default now()
);

create index if not exists fresh_ai_training_examples_type_idx
  on public.fresh_ai_training_examples (example_type, created_at desc);

alter table public.fresh_ai_training_examples enable row level security;
revoke all on table public.fresh_ai_training_examples from public, anon, authenticated;
grant all on table public.fresh_ai_training_examples to service_role;
