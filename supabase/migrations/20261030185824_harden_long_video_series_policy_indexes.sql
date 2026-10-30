-- Split owner-write policies from read policies to avoid permissive SELECT overlap.
drop policy if exists "Series owners manage seasons" on public.fresh_video_seasons;
create policy "Series owners insert seasons" on public.fresh_video_seasons
  for insert to authenticated
  with check (exists (select 1 from public.fresh_video_series s where s.id = series_id and s.creator_id = (select auth.uid())));
create policy "Series owners update seasons" on public.fresh_video_seasons
  for update to authenticated
  using (exists (select 1 from public.fresh_video_series s where s.id = series_id and s.creator_id = (select auth.uid())))
  with check (exists (select 1 from public.fresh_video_series s where s.id = series_id and s.creator_id = (select auth.uid())));
create policy "Series owners delete seasons" on public.fresh_video_seasons
  for delete to authenticated
  using (exists (select 1 from public.fresh_video_series s where s.id = series_id and s.creator_id = (select auth.uid())));

drop policy if exists "Series owners manage episodes" on public.fresh_video_episodes;
create policy "Series owners insert episodes" on public.fresh_video_episodes
  for insert to authenticated
  with check (
    exists (select 1 from public.fresh_video_series s where s.id = series_id and s.creator_id = (select auth.uid()))
    and exists (select 1 from public.posts p where p.id = post_id and p.author_id = (select auth.uid()) and p.video_url is not null)
    and exists (select 1 from public.fresh_video_seasons se where se.id = season_id and se.series_id = fresh_video_episodes.series_id)
  );
create policy "Series owners update episodes" on public.fresh_video_episodes
  for update to authenticated
  using (exists (select 1 from public.fresh_video_series s where s.id = series_id and s.creator_id = (select auth.uid())))
  with check (
    exists (select 1 from public.fresh_video_series s where s.id = series_id and s.creator_id = (select auth.uid()))
    and exists (select 1 from public.posts p where p.id = post_id and p.author_id = (select auth.uid()) and p.video_url is not null)
    and exists (select 1 from public.fresh_video_seasons se where se.id = season_id and se.series_id = fresh_video_episodes.series_id)
  );
create policy "Series owners delete episodes" on public.fresh_video_episodes
  for delete to authenticated
  using (exists (select 1 from public.fresh_video_series s where s.id = series_id and s.creator_id = (select auth.uid())));

create index if not exists fresh_video_episodes_season_series_idx
  on public.fresh_video_episodes (season_id, series_id);
