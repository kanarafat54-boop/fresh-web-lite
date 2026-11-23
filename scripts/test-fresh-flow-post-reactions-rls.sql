-- Behavioral RLS test for changing a post reaction. Runs after a full local
-- Supabase migration replay; the transaction is rolled back and uses test-only IDs.
\\set ON_ERROR_STOP on
begin;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('f1000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'post-reaction-a@example.test', '', now(), now(), now()),
  ('f1000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'post-reaction-b@example.test', '', now(), now(), now())
on conflict (id) do nothing;

insert into public.users (id, username, email, full_name)
values
  ('f1000000-0000-4000-8000-000000000001', 'post_reaction_a_test', 'post-reaction-a@example.test', 'Post Reaction A'),
  ('f1000000-0000-4000-8000-000000000002', 'post_reaction_b_test', 'post-reaction-b@example.test', 'Post Reaction B')
on conflict (id) do update
set username = excluded.username, email = excluded.email, full_name = excluded.full_name;

insert into public.posts (id, author_id, content)
values ('f2000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001', 'RLS reaction fixture')
on conflict (id) do nothing;

-- Owner A can create and change their reaction.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'f1000000-0000-4000-8000-000000000001', true);
insert into public.post_likes (post_id, user_id, reaction_type)
values ('f2000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001', 'like');
update public.post_likes
set reaction_type = 'love'
where post_id = 'f2000000-0000-4000-8000-000000000001'
  and user_id = 'f1000000-0000-4000-8000-000000000001';

do $$
begin
  if (select reaction_type from public.post_likes
      where post_id = 'f2000000-0000-4000-8000-000000000001'
        and user_id = 'f1000000-0000-4000-8000-000000000001') <> 'love' then
    raise exception 'Owner could not persist a changed post reaction';
  end if;
end
$$;

-- User B cannot change A's reaction (RLS filters the target row).
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'f1000000-0000-4000-8000-000000000002', true);
do $$
declare affected integer;
begin
  update public.post_likes set reaction_type = 'wow'
  where post_id = 'f2000000-0000-4000-8000-000000000001'
    and user_id = 'f1000000-0000-4000-8000-000000000001';
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'A different user changed another account\'s reaction';
  end if;
end
$$;

-- Even the owner cannot transfer the reaction row to another user.
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'f1000000-0000-4000-8000-000000000001', true);
do $$
begin
  begin
    update public.post_likes
    set user_id = 'f1000000-0000-4000-8000-000000000002'
    where post_id = 'f2000000-0000-4000-8000-000000000001'
      and user_id = 'f1000000-0000-4000-8000-000000000001';
    raise exception 'Owner transferred a reaction row to another user';
  exception
    when insufficient_privilege then null;
  end;
end
$$;

rollback;
\\echo Fresh Flow post-reaction RLS: PASS
