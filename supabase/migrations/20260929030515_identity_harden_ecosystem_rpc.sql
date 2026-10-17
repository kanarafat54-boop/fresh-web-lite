create or replace function public.ensure_default_ecosystem_profiles()
returns setof public.ecosystem_profiles
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  defaults text[][] := array[
    array['fresh-flow','Fresh Flow','Shorts, social and discovery feed'],
    array['wallet','Fresh Wallet','Treasury balances and payment rails'],
    array['creator','Creator Studio','Publish shorts, posts and drafts'],
    array['marketplace','Marketplace','Listings and commerce'],
    array['ai','Fresh AI','Personal intelligence workspace'],
    array['messages','Messages','Direct messages and connections'],
    array['treasure','Treasure','Saved value and collections'],
    array['crypto','Crypto','On-chain assets and rails']
  ];
  row text[];
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  foreach row slice 1 in array defaults loop
    insert into public.ecosystem_profiles(
      fresh_id,ecosystem_id,title,description,enabled,level,feed_modes,metadata
    ) values(
      v_uid,row[1],row[2],row[3],true,1,
      case when row[1]='fresh-flow' then array['for-you','social','learn','relax','others','fresh-picks'] else array[]::text[] end,
      jsonb_build_object('bootstrapped',true)
    ) on conflict(fresh_id,ecosystem_id) do nothing;
  end loop;
  return query select * from public.ecosystem_profiles where fresh_id=v_uid order by title;
end;
$function$;
