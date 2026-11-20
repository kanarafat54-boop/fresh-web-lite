-- Fresh AI platform knowledge search v2 (Postgres only, no outside AI).
-- Same signature and grants as v1, so the app code is unchanged. Ranking now combines:
--   * ts_rank_cd with length normalisation (long sections no longer win by volume),
--   * coverage: the share of the question's meaningful terms the section contains,
--   * title coverage: the share of those terms found in the section title,
--   * an exact title-in-question bonus.
-- The `rank` column stays positive for a real match and 0-equivalent rows are not returned, as before.
create or replace function public.search_fresh_platform_knowledge(p_query text, p_limit int default 4)
returns table (id uuid, title text, content text, source text, confidence numeric, rank real)
language sql
stable
set search_path = ''
as $$
  with raw as (
    select distinct w
    from regexp_split_to_table(lower(coalesce(p_query, '')), '[^a-z0-9]+') as w
    where length(w) > 1
      and w not in ('fresh','lite','web','tell','show','about','please')
  ), terms as (
    -- keep only terms the english config does not discard as stop words
    select w, to_tsquery('english', quote_literal(w)) as tq
    from raw
    where to_tsvector('english', w) <> ''::tsvector
  ), q as (
    select (select string_agg(quote_literal(w), ' | ') from terms) as expr,
           (select count(*) from terms)::real as n
  ), tsq as (
    select case when expr is null then null else to_tsquery('english', expr) end as tq, n from q
  ), cand as (
    select k.id, k.title, k.content, k.source, k.confidence::numeric as confidence, k.search_tsv, tsq.tq, tsq.n
    from public.fresh_ai_knowledge k, tsq
    where tsq.tq is not null
      and k.project_id = 'fresh-web-lite-platform'
      and k.user_id is null
      and k.search_tsv @@ tsq.tq
  ), scored as (
    select c.id, c.title, c.content, c.source, c.confidence,
      ts_rank_cd(c.search_tsv, c.tq, 1 | 4) as base,
      (select count(*) from terms t where c.search_tsv @@ t.tq)::real / greatest(c.n, 1) as cover,
      (select count(*) from terms t where to_tsvector('english', c.title) @@ t.tq)::real / greatest(c.n, 1) as tcover,
      (position(lower(c.title) in lower(coalesce(p_query, ''))) > 0) as exact_title
    from cand c
  )
  select s.id, s.title, s.content, s.source, s.confidence,
         (s.base * 2 + s.cover + s.tcover * 0.75 + case when s.exact_title then 0.5 else 0 end)::real as rank
  from scored s
  order by rank desc, s.title
  limit least(greatest(coalesce(p_limit, 4), 1), 10);
$$;

revoke all on function public.search_fresh_platform_knowledge(text, int) from public, anon, authenticated;
grant execute on function public.search_fresh_platform_knowledge(text, int) to service_role;

notify pgrst, 'reload schema';
