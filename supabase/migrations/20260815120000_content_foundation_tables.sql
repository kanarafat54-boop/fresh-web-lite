-- Content foundation tables for Posts + Shorts.
-- Required so later ALTER/INDEX/policy migrations succeed on clean local
-- replay where production already had these tables from remote history.
-- All statements are idempotent (IF NOT EXISTS).

-- Minimal public.users mirror for FK targets used by interactions/comments.
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  username text,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Bring the minimal preview users mirror up to the identity columns consumed
-- by later profile views. Existing production columns are left unchanged.
alter table public.users
  add column if not exists full_name text not null default '',
  add column if not exists verified boolean not null default false,
  add column if not exists presence text not null default 'offline';

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

-- These four interaction tables existed in production but were absent from
-- the clean-replay foundation. Their column types, keys, checks, and FK targets
-- were recovered from the live catalog using read-only inspection.
create table if not exists public.post_likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  reaction_type text default 'like'
    check (reaction_type = any (array['like','love','laugh','wow','sad','angry']::text[])),
  primary key (post_id, user_id)
);

create table if not exists public.short_likes (
  short_id uuid not null references public.shorts (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz default now(),
  reaction_type text default 'like'
    check (reaction_type = any (array['like','love','laugh','wow','sad','angry']::text[])),
  primary key (short_id, user_id)
);

create table if not exists public.saved_posts (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz default now(),
  primary key (post_id, user_id)
);

create table if not exists public.saved_shorts (
  short_id uuid not null references public.shorts (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz default now(),
  primary key (short_id, user_id)
);

alter table public.posts enable row level security;
alter table public.shorts enable row level security;
alter table public.post_comments enable row level security;
alter table public.short_comments enable row level security;
alter table public.post_likes enable row level security;
alter table public.short_likes enable row level security;
alter table public.saved_posts enable row level security;
alter table public.saved_shorts enable row level security;

create index if not exists posts_author_idx on public.posts (author_id);
create index if not exists shorts_author_idx on public.shorts (author_id);
create index if not exists post_comments_post_idx on public.post_comments (post_id);
create index if not exists short_comments_short_idx on public.short_comments (short_id);
