-- Fresh Studio Phase 1: project version history.
--
-- Studio projects reuse public.fresh_projects (owner-only RLS, `version` counter) and keep
-- Studio fields in metadata.studio, so no parallel project table is introduced.
-- This migration only adds the version-history table that fresh_projects lacks.
--
-- NOT applied automatically. Review, then apply with `supabase db push` or the Supabase MCP.

-- public.fresh_projects already exists in production (see supabase/baseline/production_public_schema_2026-10-23.sql)
-- but no earlier migration creates it, so a from-scratch replay would fail on the foreign key below.
-- This is a no-op wherever the table exists; its definition matches the production baseline exactly.
create table if not exists public.fresh_projects (
  id uuid default gen_random_uuid() not null,
  workspace_id uuid not null,
  owner_id uuid not null,
  name text not null,
  status text default 'draft'::text not null,
  version integer default 1 not null,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint fresh_projects_pkey primary key (id),
  constraint fresh_projects_version_check check (version > 0)
);

create table if not exists public.studio_project_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.fresh_projects (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  version integer not null check (version > 0),
  label text check (label is null or char_length(label) <= 120),
  kind text not null default 'autosave' check (kind in ('autosave', 'checkpoint', 'restore')),
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists studio_project_versions_project_idx
  on public.studio_project_versions (project_id, created_at desc);
create index if not exists studio_project_versions_owner_idx
  on public.studio_project_versions (owner_id);

alter table public.studio_project_versions enable row level security;

-- Owner-only, and the referenced project must also belong to the caller so a user
-- cannot attach versions to someone else's project.
drop policy if exists "studio versions owner select" on public.studio_project_versions;
create policy "studio versions owner select" on public.studio_project_versions
  for select to authenticated
  using ((select auth.uid()) = owner_id);

drop policy if exists "studio versions owner insert" on public.studio_project_versions;
create policy "studio versions owner insert" on public.studio_project_versions
  for insert to authenticated
  with check (
    (select auth.uid()) = owner_id
    and exists (
      select 1 from public.fresh_projects p
      where p.id = project_id and p.owner_id = (select auth.uid())
    )
  );

drop policy if exists "studio versions owner delete" on public.studio_project_versions;
create policy "studio versions owner delete" on public.studio_project_versions
  for delete to authenticated
  using ((select auth.uid()) = owner_id);

-- Versions are immutable snapshots: there is intentionally no UPDATE policy.
revoke all on public.studio_project_versions from anon;
grant select, insert, delete on public.studio_project_versions to authenticated;
