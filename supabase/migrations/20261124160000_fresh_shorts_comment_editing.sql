-- Fresh Shorts comment editing: author-only content updates with immutable moderation and provenance fields.
-- Preserve the original creation time for existing comments so they are not falsely marked as edited.
alter table public.short_comments
  add column if not exists updated_at timestamptz;

update public.short_comments
   set updated_at = coalesce(created_at, now())
 where updated_at is null;

alter table public.short_comments
  alter column updated_at set default now(),
  alter column updated_at set not null;

create or replace function public.set_short_comment_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if new.content is distinct from old.content then
    new.updated_at := now();
  else
    -- Pinning and moderation changes must not make the comment look text-edited.
    new.updated_at := old.updated_at;
  end if;
  return new;
end;
$$;

revoke all on function public.set_short_comment_updated_at() from public, anon, authenticated;

drop trigger if exists short_comments_set_updated_at on public.short_comments;
create trigger short_comments_set_updated_at
before update on public.short_comments
for each row execute function public.set_short_comment_updated_at();

-- Remove table-wide UPDATE grants. A commenter can change only the text and the
-- timestamp maintained by the trigger; moderation, ownership, pinning, media,
-- parent/Short linkage and creation metadata remain outside the client write surface.
revoke update on table public.short_comments from public, anon, authenticated;
grant update (content, updated_at) on table public.short_comments to authenticated;

drop policy if exists "Users can update their own short comments" on public.short_comments;
create policy "Users can update their own short comments"
on public.short_comments
for update
to authenticated
using (
  (select auth.uid()) = author_id
  and coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false
)
with check (
  (select auth.uid()) = author_id
  and coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false
);
