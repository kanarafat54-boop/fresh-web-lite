-- Universal comment media storage for Posts and Shorts.
-- Apply through Supabase migration tooling; intentionally does not alter financial/RLS authorization.
insert into storage.buckets (id, name, public)
values ('comment-media', 'comment-media', true)
on conflict (id) do update set public = excluded.public;

create policy "comment media public read"
on storage.objects for select
using (bucket_id = 'comment-media');

create policy "comment media authenticated upload own folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'comment-media'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "comment media owner update"
on storage.objects for update to authenticated
using (bucket_id = 'comment-media' and owner_id = (select auth.uid()::text));

create policy "comment media owner delete"
on storage.objects for delete to authenticated
using (bucket_id = 'comment-media' and owner_id = (select auth.uid()::text));
