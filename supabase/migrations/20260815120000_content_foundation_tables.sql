-- Content foundation tables for Posts + Shorts.
-- Required so later ALTER/INDEX migrations succeed on fresh Supabase Preview DBs
-- where production already had these tables from remote history.
-- All statements are idempotent (IF NOT EXISTS).

-- Minimal public.users mirror for FK targets used by interactions/comments.
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  username text,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.users (id) on delete set null,
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shorts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.users (id) on delete set null,
  caption text not null default '',
  sound_name text,
  video_url text not null default '',
  like_count integer not null default 0,
  comment_count integer not null default 0,
  view_count integer not null default 0,
  repost_count integer not null default 0,
  is_hot boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts (id) on delete cascade,
  author_id uuid references public.users (id) on delete set null,
  parent_id uuid references public.post_comments (id) on delete cascade,
  body text not null default '',
  content text not null default '',
  audio_url text,
  video_url text,
  attachments jsonb not null default '[]'::jsonb,
  moderation_state text not null default 'visible',
  moderation_reason text,
  moderated_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.short_comments (
  id uuid primary key default gen_random_uuid(),
  short_id uuid references public.shorts (id) on delete cascade,
  author_id uuid references public.users (id) on delete set null,
  parent_id uuid references public.short_comments (id) on delete cascade,
  body text not null default '',
  content text not null default '',
  audio_url text,
  video_url text,
  attachments jsonb not null default '[]'::jsonb,
  moderation_state text not null default 'visible',
  moderation_reason text,
  moderated_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists posts_author_idx on public.posts (author_id);
create index if not exists shorts_author_idx on public.shorts (author_id);
create index if not exists post_comments_post_idx on public.post_comments (post_id);
create index if not exists short_comments_short_idx on public.short_comments (short_id);
