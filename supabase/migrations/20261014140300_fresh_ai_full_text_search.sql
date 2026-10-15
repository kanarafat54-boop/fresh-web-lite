-- Full-text search over Fresh AI platform knowledge (Postgres only, no outside AI).
alter table public.fresh_ai_knowledge
  add column if not exists search_tsv tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(content, '')), 'B')
  ) stored;

create index if not exists fresh_ai_knowledge_search_tsv_idx
  on public.fresh_ai_knowledge using gin (search_tsv);

create or replace function public.search_fresh_platform_knowledge(p_query text, p_limit int default 4)
returns table (id uuid, title text, content text, source text, confidence numeric, rank real)
language sql
stable
set search_path = ''
as $$
  with terms as (
    select string_agg(quote_literal(w), ' | ') as expr
    from regexp_split_to_table(lower(coalesce(p_query, '')), '[^a-z0-9]+') as w
    where length(w) > 1
      and w not in ('fresh','lite','web','tell','show','about','please')
  ), q as (
    select case when expr is null then null else to_tsquery('english', expr) end as tsq from terms
  )
  select k.id, k.title, k.content, k.source, k.confidence::numeric, ts_rank_cd(k.search_tsv, q.tsq) as rank
  from public.fresh_ai_knowledge k, q
  where q.tsq is not null
    and k.project_id = 'fresh-web-lite-platform'
    and k.user_id is null
    and k.search_tsv @@ q.tsq
  order by (position(lower(k.title) in lower(coalesce(p_query, ''))) > 0) desc, rank desc, k.title
  limit least(greatest(coalesce(p_limit, 4), 1), 10);
$$;

revoke all on function public.search_fresh_platform_knowledge(text, int) from public, anon, authenticated;
grant execute on function public.search_fresh_platform_knowledge(text, int) to service_role;

with v(title, content) as (values
 ('What Fresh AI can do','Fresh AI capabilities and abilities: it can answer questions about Fresh Web Lite, explain which ecosystems are live, in progress or planned, remember context that only you can read, research the web for current facts, create images, and label claims with truth states. It can help you understand the wallet, Fresh Flow, creator tools and your profile. It cannot move money, change roles or take other high-impact actions on its own.'),
 ('What is Fresh AI','Fresh AI is the built-in assistant of Fresh Web Lite. It runs on Fresh own code and knowledge, with no outside AI model. It understands your goal, retrieves what it knows, checks claims, and answers honestly, saying so when it does not know something yet. Ask it who it is, what it can do, or about any part of the platform.'),
 ('How to get help or teach Fresh AI','If Fresh AI says it does not know something, it means that fact is not in its knowledge yet. The owner can add it to the Fresh AI knowledge base, and feedback you give on answers is used to decide what to teach it next.')
)
insert into public.fresh_ai_knowledge (user_id, project_id, title, content, modality, source, provenance, truth_state, confidence, metadata)
select null, 'fresh-web-lite-platform', v.title, v.content, 'text', 'docs/FRESH_POWERS_MISSIONS_MAP.md',
       '{"kind":"first-party","audit":"2026-10-15"}'::jsonb, 'KNOWN', 0.92, '{"dataset":"platform-knowledge-v1"}'::jsonb
from v
where not exists (select 1 from public.fresh_ai_knowledge k where k.project_id = 'fresh-web-lite-platform' and k.user_id is null and k.title = v.title);

notify pgrst, 'reload schema';
