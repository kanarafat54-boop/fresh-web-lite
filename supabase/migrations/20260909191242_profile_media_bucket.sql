-- Restored from production storage (20260909191242): profile-media bucket and owner-folder policies. Idempotent.
insert into storage.buckets (id, name, public)
values ('profile-media', 'profile-media', true)
on conflict (id) do nothing;

drop policy if exists "profile media public read" on storage.objects;
create policy "profile media public read" on storage.objects for select to public
  using (bucket_id = 'profile-media'::text);
drop policy if exists "profile media owner upload" on storage.objects;
create policy "profile media owner upload" on storage.objects for insert to authenticated
  with check ((bucket_id = 'profile-media'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text));
drop policy if exists "profile media owner update" on storage.objects;
create policy "profile media owner update" on storage.objects for update to authenticated
  using ((bucket_id = 'profile-media'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text));
drop policy if exists "profile media owner delete" on storage.objects;
create policy "profile media owner delete" on storage.objects for delete to authenticated
  using ((bucket_id = 'profile-media'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text));
