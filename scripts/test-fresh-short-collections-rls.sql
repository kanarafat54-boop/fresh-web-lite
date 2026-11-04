-- Behavioral test for the collections / pin migration. Runs against a disposable database only.
\set ON_ERROR_STOP on
insert into auth.users(id) values
  ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b');
insert into public.shorts(id, author_id) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a');
insert into public.short_comments(id, short_id, parent_id, author_id) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', null, '00000000-0000-0000-0000-00000000000b'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a');

create or replace function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', uid, false);
  execute 'set role authenticated';
end $$;
create or replace function pg_temp.expect_fail(sql text, label text) returns void language plpgsql as $$
begin
  begin
    execute sql;
  exception when others then
    return;
  end;
  raise exception 'EXPECTED FAILURE but succeeded: %', label;
end $$;

-- A creates a private collection and a public playlist.
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.fresh_short_collections(id, user_id, kind, title, visibility) values
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'collection', 'Mine', 'private'),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a', 'playlist', 'Public list', 'public');
insert into public.fresh_short_collection_items(collection_id, short_id) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001');
select pg_temp.expect_fail($q$insert into public.fresh_short_collections(user_id, kind, title, visibility) values ('00000000-0000-0000-0000-00000000000a','playlist','x','private')$q$, 'private playlist');
select pg_temp.expect_fail($q$insert into public.fresh_short_collections(user_id, title) values ('00000000-0000-0000-0000-00000000000b','spoof')$q$, 'insert as another user');
select pg_temp.expect_fail($q$insert into public.fresh_short_collections(user_id, title) values ('00000000-0000-0000-0000-00000000000a','   ')$q$, 'blank title');

-- B sees only the public playlist and its items; cannot write A's lists.
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
do $$ begin
  if (select count(*) from public.fresh_short_collections) <> 1 then raise exception 'B should see exactly 1 collection'; end if;
  if (select count(*) from public.fresh_short_collection_items) <> 1 then raise exception 'B should see exactly 1 item'; end if;
end $$;
select pg_temp.expect_fail($q$insert into public.fresh_short_collection_items(collection_id, short_id) values ('30000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001')$q$, 'B adds to A playlist (dup pk or rls)');
do $$ declare n int; begin
  update public.fresh_short_collections set title = 'hacked' where id = '30000000-0000-0000-0000-000000000002';
  get diagnostics n = row_count; if n <> 0 then raise exception 'B updated A playlist'; end if;
  delete from public.fresh_short_collections where id = '30000000-0000-0000-0000-000000000002';
  get diagnostics n = row_count; if n <> 0 then raise exception 'B deleted A playlist'; end if;
end $$;

-- Anonymous sees public playlist only.
reset role; set role anon; select set_config('request.jwt.claim.sub', '', false);
do $$ begin
  if (select count(*) from public.fresh_short_collections) <> 1 then raise exception 'anon should see 1 public collection'; end if;
end $$;
select pg_temp.expect_fail($q$insert into public.fresh_short_collections(user_id, title) values ('00000000-0000-0000-0000-00000000000a','anon')$q$, 'anon insert');

-- Pinning: only the Short's creator, only top-level, one per Short.
reset role; select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select pg_temp.expect_fail($q$select public.pin_short_comment('20000000-0000-0000-0000-000000000001', true)$q$, 'non-creator pin');
reset role; select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select pg_temp.expect_fail($q$select public.pin_short_comment('20000000-0000-0000-0000-000000000002', true)$q$, 'pin a reply');
select public.pin_short_comment('20000000-0000-0000-0000-000000000001', true);
reset role; set role anon;
select pg_temp.expect_fail($q$select public.pin_short_comment('20000000-0000-0000-0000-000000000001', false)$q$, 'anon pin');
reset role;
do $$ begin
  if (select pinned_at from public.short_comments where id = '20000000-0000-0000-0000-000000000001') is null then raise exception 'pin did not persist'; end if;
end $$;
\echo short collections and pin RLS: ok
