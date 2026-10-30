-- Fresh Flow Long Videos: creator-owned series, seasons and episode ordering.
create table if not exists public.fresh_video_series (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 140),
  description text not null default '' check (char_length(description) <= 4000),
  poster_url text,
  visibility text not null default 'private' check (visibility in ('private','unlisted','public')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.fresh_video_series enable row level security;
grant select on public.fresh_video_series to anon, authenticated;
grant insert, update, delete on public.fresh_video_series to authenticated;
drop policy if exists "Series owners manage and public series are readable" on public.fresh_video_series;
create policy "Series owners manage and public series are readable"
  on public.fresh_video_series for select to anon, authenticated
  using (visibility in ('public','unlisted') or creator_id = (select auth.uid()));
drop policy if exists "Creators create own video series" on public.fresh_video_series;
create policy "Creators create own video series"
  on public.fresh_video_series for insert to authenticated
  with check (creator_id = (select auth.uid()));
drop policy if exists "Creators update own video series" on public.fresh_video_series;
create policy "Creators update own video series"
  on public.fresh_video_series for update to authenticated
  using (creator_id = (select auth.uid()))
  with check (creator_id = (select auth.uid()));
drop policy if exists "Creators delete own video series" on public.fresh_video_series;
create policy "Creators delete own video series"
  on public.fresh_video_series for delete to authenticated
  using (creator_id = (select auth.uid()));
create index if not exists fresh_video_series_creator_updated_idx
  on public.fresh_video_series (creator_id, updated_at desc);
create index if not exists fresh_video_series_public_updated_idx
  on public.fresh_video_series (updated_at desc) where visibility = 'public';

create table if not exists public.fresh_video_seasons (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references public.fresh_video_series(id) on delete cascade,
  season_number integer not null check (season_number > 0),
  title text not null default '',
  description text not null default '' check (char_length(description) <= 2000),
  created_at timestamptz not null default now(),
  unique (series_id, season_number),
  unique (id, series_id)
);
alter table public.fresh_video_seasons enable row level security;
grant select on public.fresh_video_seasons to anon, authenticated;
grant insert, update, delete on public.fresh_video_seasons to authenticated;
drop policy if exists "Seasons readable with series access" on public.fresh_video_seasons;
create policy "Seasons readable with series access"
  on public.fresh_video_seasons for select to anon, authenticated
  using (exists (
    select 1 from public.fresh_video_series s
    where s.id = series_id and (s.visibility in ('public','unlisted') or s.creator_id = (select auth.uid()))
  ));
drop policy if exists "Series owners manage seasons" on public.fresh_video_seasons;
create policy "Series owners manage seasons"
  on public.fresh_video_seasons for all to authenticated
  using (exists (select 1 from public.fresh_video_series s where s.id = series_id and s.creator_id = (select auth.uid())))
  with check (exists (select 1 from public.fresh_video_series s where s.id = series_id and s.creator_id = (select auth.uid())));

create table if not exists public.fresh_video_episodes (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references public.fresh_video_series(id) on delete cascade,
  season_id uuid not null,
  post_id uuid not null unique references public.posts(id) on delete cascade,
  episode_number integer not null check (episode_number > 0),
  title_override text check (title_override is null or char_length(title_override) <= 180),
  description_override text check (description_override is null or char_length(description_override) <= 4000),
  created_at timestamptz not null default now(),
  unique (season_id, episode_number),
  foreign key (season_id, series_id) references public.fresh_video_seasons(id, series_id) on delete cascade
);
alter table public.fresh_video_episodes enable row level security;
grant select on public.fresh_video_episodes to anon, authenticated;
grant insert, update, delete on public.fresh_video_episodes to authenticated;
drop policy if exists "Episodes readable with series access" on public.fresh_video_episodes;
create policy "Episodes readable with series access"
  on public.fresh_video_episodes for select to anon, authenticated
  using (exists (
    select 1 from public.fresh_video_series s
    join public.posts p on p.id = post_id
    where s.id = series_id
      and (s.visibility in ('public','unlisted') or s.creator_id = (select auth.uid()))
      and (s.creator_id = (select auth.uid()) or (
        p.video_status = 'published'
        and p.video_visibility in ('public','unlisted')
        and (p.video_scheduled_at is null or p.video_scheduled_at <= now())
      ))
  ));
drop policy if exists "Series owners manage episodes" on public.fresh_video_episodes;
create policy "Series owners manage episodes"
  on public.fresh_video_episodes for all to authenticated
  using (exists (select 1 from public.fresh_video_series s where s.id = series_id and s.creator_id = (select auth.uid())))
  with check (
    exists (select 1 from public.fresh_video_series s where s.id = series_id and s.creator_id = (select auth.uid()))
    and exists (select 1 from public.posts p where p.id = post_id and p.author_id = (select auth.uid()) and p.video_url is not null)
    and exists (select 1 from public.fresh_video_seasons se where se.id = season_id and se.series_id = fresh_video_episodes.series_id)
  );
create index if not exists fresh_video_episodes_series_order_idx
  on public.fresh_video_episodes (series_id, season_id, episode_number);
