-- Fresh Shorts creator-controlled download permission.
-- Downloads are opt-in per Short. The default is deliberately false.
-- Keep UPDATE grants column-scoped so clients cannot edit unrelated Short fields.

alter table public.shorts
  add column if not exists allow_download boolean not null default false;

revoke update on table public.shorts from public, anon, authenticated;
grant update (allow_download) on table public.shorts to authenticated;

drop policy if exists shorts_creator_download_permission_update on public.shorts;
create policy shorts_creator_download_permission_update
  on public.shorts
  for update
  to authenticated
  using ((select auth.uid()) = author_id)
  with check ((select auth.uid()) = author_id);

comment on column public.shorts.allow_download is
  'Creator-controlled opt-in for the official Fresh Shorts download action. Defaults to false.';
