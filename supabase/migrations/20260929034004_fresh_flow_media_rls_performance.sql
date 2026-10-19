create index if not exists treasury_rail_requests_instrument_id_idx
  on public.treasury_rail_requests (instrument_id);
create index if not exists treasury_rail_requests_ledger_transaction_id_idx
  on public.treasury_rail_requests (ledger_transaction_id);

drop policy if exists "Users can delete their own comments" on public.post_comments;
create policy "Users can delete their own comments" on public.post_comments for delete to public
using ((select auth.uid()) = author_id);

drop policy if exists "Users can insert their own comments" on public.post_comments;
create policy "Users can insert their own comments" on public.post_comments for insert to public
with check ((select auth.uid()) = author_id);

drop policy if exists "Users can like as themselves" on public.post_likes;
create policy "Users can like as themselves" on public.post_likes for insert to public
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can unlike their own like" on public.post_likes;
create policy "Users can unlike their own like" on public.post_likes for delete to public
using ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own posts" on public.posts;
create policy "Users can delete their own posts" on public.posts for delete to public
using ((select auth.uid()) = author_id);

drop policy if exists "Users can insert their own posts" on public.posts;
create policy "Users can insert their own posts" on public.posts for insert to public
with check ((select auth.uid()) = author_id);

drop policy if exists "Users can save posts" on public.saved_posts;
create policy "Users can save posts" on public.saved_posts for insert to public
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can unsave posts" on public.saved_posts;
create policy "Users can unsave posts" on public.saved_posts for delete to public
using ((select auth.uid()) = user_id);

drop policy if exists "Users can view their own saved posts" on public.saved_posts;
create policy "Users can view their own saved posts" on public.saved_posts for select to public
using ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own short comments" on public.short_comments;
create policy "Users can delete their own short comments" on public.short_comments for delete to public
using ((select auth.uid()) = author_id);

drop policy if exists "Users can insert their own short comments" on public.short_comments;
create policy "Users can insert their own short comments" on public.short_comments for insert to public
with check ((select auth.uid()) = author_id);

drop policy if exists "Users can like shorts" on public.short_likes;
create policy "Users can like shorts" on public.short_likes for insert to public
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can unlike shorts" on public.short_likes;
create policy "Users can unlike shorts" on public.short_likes for delete to public
using ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own shorts" on public.shorts;
create policy "Users can delete their own shorts" on public.shorts for delete to public
using ((select auth.uid()) = author_id);

drop policy if exists "Users can insert their own shorts" on public.shorts;
create policy "Users can insert their own shorts" on public.shorts for insert to public
with check ((select auth.uid()) = author_id);
