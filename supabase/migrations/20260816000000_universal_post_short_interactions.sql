-- Universal interaction storage for Posts + Shorts.
-- Adds multimedia attachments and moderation metadata without changing existing RLS/financial rules.

alter table public.post_comments
  add column if not exists attachments jsonb not null default '[]'::jsonb,
  add column if not exists moderation_state text not null default 'visible',
  add column if not exists moderation_reason text,
  add column if not exists moderated_at timestamptz;

alter table public.short_comments
  add column if not exists attachments jsonb not null default '[]'::jsonb,
  add column if not exists moderation_state text not null default 'visible',
  add column if not exists moderation_reason text,
  add column if not exists moderated_at timestamptz;

create index if not exists post_comments_parent_idx on public.post_comments(parent_id);
create index if not exists short_comments_parent_idx on public.short_comments(parent_id);
create index if not exists post_comments_moderation_idx on public.post_comments(moderation_state);
create index if not exists short_comments_moderation_idx on public.short_comments(moderation_state);

alter table public.post_comments drop constraint if exists post_comments_moderation_state_check;
alter table public.post_comments add constraint post_comments_moderation_state_check
  check (moderation_state in ('visible','pending','approved','limited','hidden','removed','appealed','blocked'));

alter table public.short_comments drop constraint if exists short_comments_moderation_state_check;
alter table public.short_comments add constraint short_comments_moderation_state_check
  check (moderation_state in ('visible','pending','approved','limited','hidden','removed','appealed','blocked'));
