-- Private bucket for Fresh Studio export sources. Objects live under <user id>/<project id>/<asset id>.
-- Only the owner can read or write their own folder; the render worker receives short-lived signed URLs.
insert into storage.buckets (id, name, public, file_size_limit)
values ('studio-media', 'studio-media', false, 524288000)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

drop policy if exists "studio_media_owner_select" on storage.objects;
drop policy if exists "studio_media_owner_insert" on storage.objects;
drop policy if exists "studio_media_owner_update" on storage.objects;
drop policy if exists "studio_media_owner_delete" on storage.objects;

create policy "studio_media_owner_select" on storage.objects for select to authenticated
  using (bucket_id = 'studio-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "studio_media_owner_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'studio-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "studio_media_owner_update" on storage.objects for update to authenticated
  using (bucket_id = 'studio-media' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'studio-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "studio_media_owner_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'studio-media' and (storage.foldername(name))[1] = auth.uid()::text);
