#!/usr/bin/env bash
# Validates supabase/migrations/20261024090000_fresh_web_index_foundation.sql on a scratch Postgres
# (uses PG* env vars, like scripts/test-phase0-postgres-behavior.sh). Requires an empty database.
set -euo pipefail
psql -X -q -v ON_ERROR_STOP=1 -c "do \$\$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if; end \$\$;
  grant usage on schema public to anon, authenticated, service_role;"
psql -X -q -v ON_ERROR_STOP=1 -f supabase/migrations/20260906090000_fresh_intelligence_foundation.sql
M=supabase/migrations/20261024090000_fresh_web_index_foundation.sql
psql -X -q -v ON_ERROR_STOP=1 -f "$M" 2>/dev/null
psql -X -q -v ON_ERROR_STOP=1 -f "$M" 2>/dev/null   # idempotent re-run
out=$(psql -X -v ON_ERROR_STOP=1 -qAt <<'SQL'
set role service_role;
insert into fresh_web_documents(canonical_url,host,title,language,content_hash) values ('https://a.test/x','a.test','Coral','en','h1'),('https://b.test/y','b.test','Corail','fr','h2'),('https://c.test/z','c.test','Gone','en','h3');
insert into fresh_web_passages(document_id,version,ordinal,body) select id,1,0,case host when 'a.test' then 'Coral bleaching happens when ocean temperatures rise.' when 'b.test' then 'Le blanchiment du corail est provoque par la chaleur.' else 'Coral bleaching removed page.' end from fresh_web_documents;
update fresh_web_documents set status='removed' where host='c.test';
select 'live-only:' || count(*) from search_fresh_web_passages('coral bleaching');
select 'lang-fr:' || canonical_url from search_fresh_web_passages('blanchiment corail',10,'fr');
select 'lang-en-excludes-fr:' || count(*) from search_fresh_web_passages('corail',10,'en');
SQL
)
grep -qx 'live-only:1' <<<"$out" || { echo "FAIL removed docs leak into search: $out"; exit 1; }
grep -qx 'lang-fr:https://b.test/y' <<<"$out" || { echo "FAIL language filter: $out"; exit 1; }
grep -qx 'lang-en-excludes-fr:0' <<<"$out" || { echo "FAIL language exclusion: $out"; exit 1; }
for role in anon authenticated; do
  for stmt in "select count(*) from fresh_web_documents" "select * from search_fresh_web_passages('coral')"; do
    if psql -X -qAt -c "set role $role; $stmt" >/dev/null 2>&1; then echo "FAIL $role can run: $stmt"; exit 1; fi
  done
done
echo "Fresh web index migration: PASS (idempotent, RLS on, anon/authenticated denied, removed docs excluded, language filter)"
