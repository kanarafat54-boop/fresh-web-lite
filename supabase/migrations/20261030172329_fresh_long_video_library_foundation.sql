-- Fresh Flow Long Videos: metadata, private library data, playlists, and upload hardening.
-- Applied to the active Fresh Web Lite project as migration 20261030172329.

alter table public.posts
  add column if not exists video_title text,
  add column if not exists video_description text,
  add column if not exists video_category text,
  add column if not exists video_tags text[] not null default '{}',
  add column if not exists video_thumbnail_url text,
  add column if not exists video_duration_seconds integer,
  add column if not exists video_visibility text not null default 'public',
  add column if not exists video_status text not null default 'published',
  add column if not exists video_scheduled_at timestamptz,
  add column if not exists video_published_at timestamptz default now();

alter table public.posts
  drop constraint if exists posts_video_visibility_check,
  add constraint posts_video_visibility_check
    check (video_visibility in ('public', 'unlisted')),
  drop constraint if exists posts_video_status_check,
  add constraint posts_video_status_check
    check (video_status in ('processing', 'scheduled', 'published', 'failed')),
  drop constraint if exists posts_video_duration_check,
  add constraint posts_video_duration_check
    check (video_duration_seconds is null or video_duration_seconds >= 0);

alter table public.creator_drafts
  add column if not exists long_video_metadata jsonb not null default '{}'::jsonb,
  add column if not exists upload_error text,
  add column if not exists upload_progress numeric(5,2) not null default 0;

alter table public.creator_drafts
  drop constraint if exists creator_drafts_long_video_metadata_object_check,
  add constraint creator_drafts_long_video_metadata_object_check
    check (jsonb_typeof(long_video_metadata) = 'object'),
  drop constraint if exists creator_drafts_upload_progress_check,
  add constraint creator_drafts_upload_progress_check
    check (upload_progress >= 0 and upload_progress <= 100);

create index if not exists posts_public_video_discovery_idx
  on public.posts (created_at desc)
  where video_url is not null and video_status in ('published', 'scheduled');

create index if not exists posts_video_creator_idx
  on public.posts (author_id, created_at desc)
  where video_url is not null;

drop policy if exists "Anyone can view posts" on public.posts;
create policy "Public can view published posts and owners can view their videos"
  on public.posts
  for select
  to anon, authenticated
  using (
    video_url is null
    or (
      video_status in ('published', 'scheduled')
      and video_visibility in ('public', 'unlisted')
      and (video_scheduled_at is null or video_scheduled_at <= now())
    )
    or author_id = (select auth.uid())
  );

create table if not exists public.fresh_long_video_watch_history (
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  progress_seconds double precision not null default 0 check (progress_seconds >= 0),
  duration_seconds double precision check (duration_seconds is null or duration_seconds > 0),
  progress_percent numeric(5,2) not null default 0 check (progress_percent >= 0 and progress_percent <= 100),
  last_watched_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
alter table public.fresh_long_video_watch_history enable row level security;
grant select, insert, update, delete on public.fresh_long_video_watch_history to authenticated;
drop policy if exists "Users manage their own long video watch history" on public.fresh_long_video_watch_history;
create policy "Users manage their own long video watch history"
  on public.fresh_long_video_watch_history
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create index if not exists fresh_long_video_watch_history_recent_idx
  on public.fresh_long_video_watch_history (user_id, last_watched_at desc);

create table if not exists public.fresh_video_playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 100),
  description text not null default '' check (char_length(description) <= 2000),
  visibility text not null default 'private' check (visibility in ('private', 'unlisted', 'public')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.fresh_video_playlists enable row level security;
grant select on public.fresh_video_playlists to anon, authenticated;
grant insert, update, delete on public.fresh_video_playlists to authenticated;
create policy "Playlist owners manage playlists and public playlists are readable"
  on public.fresh_video_playlists
  for select
  to anon, authenticated
  using (visibility in ('public', 'unlisted') or (select auth.uid()) = user_id);
create policy "Playlist owners create playlists"
  on public.fresh_video_playlists
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Playlist owners update playlists"
  on public.fresh_video_playlists
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Playlist owners delete playlists"
  on public.fresh_video_playlists
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
create index if not exists fresh_video_playlists_owner_updated_idx
  on public.fresh_video_playlists (user_id, updated_at desc);

create table if not exists public.fresh_video_playlist_items (
  playlist_id uuid not null references public.fresh_video_playlists(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  position integer not null default 0 check (position >= 0),
  added_at timestamptz not null default now(),
  primary key (playlist_id, post_id)
);
alter table public.fresh_video_playlist_items enable row level security;
grant select on public.fresh_video_playlist_items to anon, authenticated;
grant insert, update, delete on public.fresh_video_playlist_items to authenticated;
create policy "Playlist items readable with playlist access"
  on public.fresh_video_playlist_items
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.fresh_video_playlists p
      where p.id = playlist_id
        and (p.visibility in ('public', 'unlisted') or p.user_id = (select auth.uid()))
    )
  );
create policy "Playlist owners add items"
  on public.fresh_video_playlist_items
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.fresh_video_playlists p
      where p.id = playlist_id and p.user_id = (select auth.uid())
    )
  );
create policy "Playlist owners update items"
  on public.fresh_video_playlist_items
  for update
  to authenticated
  using (
    exists (
      select 1 from public.fresh_video_playlists p
      where p.id = playlist_id and p.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.fresh_video_playlists p
      where p.id = playlist_id and p.user_id = (select auth.uid())
    )
  );
create policy "Playlist owners remove items"
  on public.fresh_video_playlist_items
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.fresh_video_playlists p
      where p.id = playlist_id and p.user_id = (select auth.uid())
    )
  );
create index if not exists fresh_video_playlist_items_order_idx
  on public.fresh_video_playlist_items (playlist_id, position, added_at);

update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array['video/mp4', 'video/webm', 'video/quicktime']
where id = 'post-videos';

drop policy if exists "Authenticated users can upload post videos" on storage.objects;
create policy "Users can upload own post videos"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'post-videos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
