-- Fresh Shorts: per-Short audience (Public / Followers / Private), enforced in the database.
--
-- Applied to the Fresh Web Lite project on 2026-11-27.
--
-- Additive in behavior: every existing Short is 'public', which is exactly what the read policy allowed before.
-- Only the creator can change a Short's audience (column-scoped UPDATE grant, same pattern as allow_download).
--
-- Scope of enforcement: this restricts reads of public.shorts for the roles that go through RLS (the app, anon).
-- Code running as service_role bypasses RLS by design and must apply the audience itself.
--
-- Rollback:
--   alter policy shorts_visible on public.shorts using ((moderation_state = 'visible') or (author_id = (select auth.uid())) or is_platform_reviewer());
--   revoke update (audience) on public.shorts from authenticated;
--   alter table public.shorts drop column if exists audience;
--   drop function if exists public.fresh_viewer_follows(uuid);

alter table public.shorts add column if not exists audience text not null default 'public';
do $$ begin
  alter table public.shorts add constraint shorts_audience_check check (audience in ('public', 'followers', 'private'));
exception when duplicate_object then null; end $$;

-- Does the signed-in viewer follow this author? Security definer so the check does not depend on the follows read policy.
create or replace function public.fresh_viewer_follows(p_author_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp
as $$ select exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.followed_id = p_author_id); $$;
revoke all on function public.fresh_viewer_follows(uuid) from public;
-- anon needs EXECUTE too: the shorts read policy applies to signed-out visitors, and Postgres checks EXECUTE on every function in
-- the policy even when the row is public. For anon the function simply returns false (auth.uid() is null).
grant execute on function public.fresh_viewer_follows(uuid) to anon, authenticated;

alter policy shorts_visible on public.shorts using (
  (
    moderation_state = 'visible'
    and (
      audience = 'public'
      or (audience = 'followers' and (select auth.uid()) is not null and public.fresh_viewer_follows(author_id))
    )
  )
  or author_id = (select auth.uid())
  or is_platform_reviewer()
);

grant update (audience) on public.shorts to authenticated;

comment on column public.shorts.audience is
  'Creator-controlled audience: public (everyone), followers (people who follow the creator), private (only the creator). Defaults to public.';
