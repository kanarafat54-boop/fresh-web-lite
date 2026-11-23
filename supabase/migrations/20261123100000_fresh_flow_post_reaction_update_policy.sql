-- Restore public reaction-read policies for tables present in the clean migration chain.
-- short_reposts is production-only and has no repository migration that creates it;
-- do not reference that baseline-only table in a clean replay.
drop policy if exists "Anyone can view likes" on public.post_likes;
create policy "Anyone can view likes"
  on public.post_likes
  for select
  to public
  using (true);

drop policy if exists "Short likes viewable by everyone" on public.short_likes;
create policy "Short likes viewable by everyone"
  on public.short_likes
  for select
  to public
  using (true);

-- Allow an authenticated user to change the reaction on their own post-like row.
-- Keep ownership immutable in both the row visibility and resulting row check.
drop policy if exists "Users can update their own post reactions" on public.post_likes;
create policy "Users can update their own post reactions"
  on public.post_likes
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
