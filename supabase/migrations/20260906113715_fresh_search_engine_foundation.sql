-- Fresh search engine foundation.
--
-- This version already exists in the production migration history, but its SQL was
-- never committed (the file was an empty placeholder), so a database rebuilt from
-- this repository had no full-text search. The definitions below were read back
-- from the live production database and written as idempotent statements:
-- on production every statement is a no-op, on a rebuild they create the objects.
--
-- Search is derived data (see "Source of truth: Search -> derived index"):
-- posts and shorts stay the source of truth; the tsvector columns are generated
-- from them and can never drift.

-- 1. posts columns the app and search rely on.
-- The earlier content foundation migration creates posts with a "body" column
-- while production uses these. "if not exists" keeps production untouched.
alter table public.posts add column if not exists content text not null default '';
alter table public.posts add column if not exists like_count integer not null default 0;
alter table public.posts add column if not exists comment_count integer not null default 0;
alter table public.posts add column if not exists image_url text;
alter table public.posts add column if not exists video_url text;

-- 2. Generated full-text vectors (identical expressions to production).
alter table public.posts add column if not exists search_vector tsvector
  generated always as (to_tsvector('english'::regconfig, coalesce(content, ''::text))) stored;

alter table public.shorts add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('english'::regconfig, coalesce(caption, ''::text)), 'A'::"char")
    || setweight(to_tsvector('english'::regconfig, coalesce(sound_name, ''::text)), 'B'::"char")
  ) stored;

create index if not exists posts_search_vector_idx on public.posts using gin (search_vector);
create index if not exists shorts_search_vector_idx on public.shorts using gin (search_vector);

-- 3. Cross-object search documents (empty and not yet used by the app).
create table if not exists public.fresh_search_documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users (id) on delete cascade,
  object_id uuid,
  title text not null default '',
  body text not null default '',
  visibility text not null default 'private'
    constraint fresh_search_documents_visibility_check
    check (visibility in ('private', 'shared', 'public')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Production links object_id to fresh_universal_objects. That table's definition is
-- also missing from the repository, so the link is only added when the table exists.
do $$
begin
  if to_regclass('public.fresh_universal_objects') is not null
     and not exists (
       select 1 from pg_constraint
       where conname = 'fresh_search_documents_object_id_fkey'
         and conrelid = 'public.fresh_search_documents'::regclass
     ) then
    alter table public.fresh_search_documents
      add constraint fresh_search_documents_object_id_fkey
      foreign key (object_id) references public.fresh_universal_objects (id) on delete cascade;
  end if;
end
$$;

create index if not exists fresh_search_documents_owner_idx
  on public.fresh_search_documents (owner_id, created_at desc);
create index if not exists fresh_search_documents_object_idx
  on public.fresh_search_documents (object_id);

-- 4. Row-level security: public documents are readable by signed-in users,
-- everything else only by its owner; only the owner can write.
alter table public.fresh_search_documents enable row level security;

drop policy if exists "fresh search readable" on public.fresh_search_documents;
create policy "fresh search readable" on public.fresh_search_documents
  for select to authenticated
  using (visibility = 'public' or (select auth.uid()) = owner_id);

drop policy if exists "fresh search owner insert" on public.fresh_search_documents;
create policy "fresh search owner insert" on public.fresh_search_documents
  for insert to authenticated
  with check ((select auth.uid()) = owner_id);

drop policy if exists "fresh search owner update" on public.fresh_search_documents;
create policy "fresh search owner update" on public.fresh_search_documents
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists "fresh search owner delete" on public.fresh_search_documents;
create policy "fresh search owner delete" on public.fresh_search_documents
  for delete to authenticated
  using ((select auth.uid()) = owner_id);
