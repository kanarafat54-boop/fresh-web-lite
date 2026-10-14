-- Verify Fresh Flow's documented default mode is accepted and unknown modes remain rejected.
insert into public.ecosystem_profiles (fresh_id, ecosystem_id, feed_modes)
values ('11111111-1111-4111-8111-111111111111', 'fresh-flow', array['for-you','fresh-picks']::text[]);

do $$
begin
  if not exists (
    select 1 from public.ecosystem_profiles
    where ecosystem_id = 'fresh-flow' and feed_modes @> array['fresh-picks']::text[]
  ) then
    raise exception 'fresh-picks mode was not persisted';
  end if;

  begin
    insert into public.ecosystem_profiles (fresh_id, ecosystem_id, feed_modes)
    values ('22222222-2222-4222-8222-222222222222', 'invalid-test', array['not-a-real-mode']::text[]);
    raise exception 'invalid feed mode unexpectedly accepted';
  exception when check_violation then
    null;
  end;
end
$$;

select 'PASS: fresh-picks accepted; unknown feed modes rejected' as result;
