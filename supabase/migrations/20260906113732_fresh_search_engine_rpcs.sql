-- Fresh search engine RPCs.
--
-- Already present in production, but the SQL was never committed (this file was an
-- empty placeholder). Read back from the live database; idempotent, so on
-- production it is a no-op. Used by src/features/fresh-flow/core/searchService.ts.

create or replace function public.search_posts_fulltext(p_query text, p_limit integer default 20)
returns table(id uuid, author_id uuid, content text, image_url text, like_count integer, rank real)
language sql
stable
set search_path to 'public'
as $function$
  select p.id, p.author_id, p.content, p.image_url, p.like_count,
         ts_rank(p.search_vector, websearch_to_tsquery('english', p_query)) as rank
  from public.posts p
  where p.search_vector @@ websearch_to_tsquery('english', p_query)
  order by rank desc
  limit p_limit;
$function$;

create or replace function public.search_shorts_fulltext(p_query text, p_limit integer default 20)
returns table(id uuid, author_id uuid, caption text, sound_name text, video_url text, like_count integer, rank real)
language sql
stable
set search_path to 'public'
as $function$
  select s.id, s.author_id, s.caption, s.sound_name, s.video_url, s.like_count,
         ts_rank(s.search_vector, websearch_to_tsquery('english', p_query)) as rank
  from public.shorts s
  where s.search_vector @@ websearch_to_tsquery('english', p_query)
  order by rank desc
  limit p_limit;
$function$;

-- Production grants: callable by anonymous and signed-in users and the service role,
-- not by the implicit PUBLIC role.
revoke all on function public.search_posts_fulltext(text, integer) from public;
revoke all on function public.search_shorts_fulltext(text, integer) from public;
grant execute on function public.search_posts_fulltext(text, integer) to anon, authenticated, service_role;
grant execute on function public.search_shorts_fulltext(text, integer) to anon, authenticated, service_role;
