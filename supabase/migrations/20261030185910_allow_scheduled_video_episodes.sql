drop policy if exists "Episodes readable with series access" on public.fresh_video_episodes;
create policy "Episodes readable with series access"
  on public.fresh_video_episodes for select to anon, authenticated
  using (exists (
    select 1 from public.fresh_video_series s
    join public.posts p on p.id = post_id
    where s.id = series_id
      and (s.visibility in ('public','unlisted') or s.creator_id = (select auth.uid()))
      and (s.creator_id = (select auth.uid()) or (
        p.video_status in ('published','scheduled')
        and p.video_visibility in ('public','unlisted')
        and (p.video_scheduled_at is null or p.video_scheduled_at <= now())
      ))
  ));
