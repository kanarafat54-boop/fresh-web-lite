-- Ensure Long Video storage exists in clean local replays as well as restored production projects.
-- The live project already had this bucket; earlier metadata hardening only UPDATEd it,
-- which silently affected zero rows on a fresh Supabase stack.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'post-videos',
  'post-videos',
  true,
  52428800,
  array['video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Reassert the owner-folder upload boundary after bucket provisioning.
drop policy if exists "Authenticated users can upload post videos" on storage.objects;
drop policy if exists "Users can upload own post videos" on storage.objects;
create policy "Users can upload own post videos"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'post-videos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
