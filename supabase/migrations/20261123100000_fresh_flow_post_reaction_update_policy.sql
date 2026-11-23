-- Restore the public reaction-read policy recorded in the production schema baseline.
-- The clean migration chain enabled RLS but did not recreate this policy.
drop policy if exists "Anyone can view likes" on public.post_likes;
create policy "Anyone can view likes"
  on public.post_likes
  for select
  to public
  using (true);

-- Allow an authenticated user to change the reaction on their own post-like row.
-- The feed and shared media workspace already expose reaction switching, but the
-- existing policy set only permits INSERT and DELETE. Keep ownership immutable.
drop policy if exists "Users can update their own post reactions" on public.post_likes;
create policy "Users can update their own post reactions"
  on public.post_likes
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
