#!/usr/bin/env bash
# Validates supabase/migrations/20261024090000_fresh_web_index_foundation.sql on a scratch Postgres
# (uses PG* env vars, like scripts/test-phase0-postgres-behavior.sh). Requires an empty database.
set -euo pipefail
if ! pg_isready -q 2>/dev/null; then echo "SKIP-AS-FAILURE: no reachable Postgres (set PGHOST/PGPORT/PGUSER[/PGPASSWORD] to an empty scratch database)"; exit 2; fi
psql -X -q -v ON_ERROR_STOP=1 -c "do \$\$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if; end \$\$;
  grant usage on schema public to anon, authenticated, service_role;"
psql -X -q -v ON_ERROR_STOP=1 -f supabase/migrations/20260906090000_fresh_intelligence_foundation.sql
M=supabase/migrations/20261024090000_fresh_web_index_foundation.sql
W=supabase/migrations/20261024100000_fresh_web_index_write_rpcs.sql
for f in "$M" "$W"; do
  psql -X -q -v ON_ERROR_STOP=1 -f "$f" 2>/dev/null
  psql -X -q -v ON_ERROR_STOP=1 -f "$f" 2>/dev/null   # idempotent re-run
done
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
H1=$(printf 'a%.0s' $(seq 64)); H2=$(printf 'b%.0s' $(seq 64))
w=$(psql -X -v ON_ERROR_STOP=1 -qAt <<SQL
set role service_role;
select 'v1:' || (select r->>'status' from (select upsert_fresh_web_document('{"canonical_url":"https://w.test/p","host":"w.test","title":"W","language":"en","content_hash":"$H1","passages":[{"ordinal":0,"text":"Glaciers retreat as temperatures climb."}]}'::jsonb) r) s) ;
select 'same:' || ((upsert_fresh_web_document('{"canonical_url":"https://w.test/p","host":"w.test","title":"W","content_hash":"$H1","passages":[{"ordinal":0,"text":"Glaciers retreat as temperatures climb."}]}'::jsonb))->>'status');
select 'v2:' || ((upsert_fresh_web_document('{"canonical_url":"https://w.test/p","host":"w.test","title":"W","content_hash":"$H2","passages":[{"ordinal":0,"text":"Volcanoes erupt with lava."}]}'::jsonb))->>'version');
select 'old-gone:' || count(*) from search_fresh_web_passages('glaciers');
select 'new-found:' || count(*) from search_fresh_web_passages('volcanoes');
select 'versions:' || count(*) from fresh_web_document_versions v join fresh_web_documents d on d.id=v.document_id where d.canonical_url='https://w.test/p';
select 'removed:' || mark_fresh_web_document_removed('https://w.test/p');
select 'removed-again:' || mark_fresh_web_document_removed('https://w.test/p');
select 'after-removal:' || count(*) from search_fresh_web_passages('volcanoes');
select 'stats:' || ((fresh_web_index_stats())->>'documents');
SQL
)
for expect in 'v1:indexed' 'same:unchanged' 'v2:2' 'old-gone:0' 'new-found:1' 'versions:2' 'removed:true' 'removed-again:false' 'after-removal:0'; do
  grep -qx "$expect" <<<"$w" || { echo "FAIL write rpc, expected $expect in: $w"; exit 1; }
done
for stmt in "select upsert_fresh_web_document('{}'::jsonb)" "select mark_fresh_web_document_removed('https://w.test/p')" "select fresh_web_index_stats()"; do
  for role in anon authenticated; do
    if psql -X -qAt -c "set role $role; $stmt" >/dev/null 2>&1; then echo "FAIL $role can run: $stmt"; exit 1; fi
  done
done
if psql -X -qAt -c "set role service_role; select upsert_fresh_web_document('{\"canonical_url\":\"ftp://x\"}'::jsonb)" >/dev/null 2>&1; then echo "FAIL invalid url accepted"; exit 1; fi
echo "Fresh web index migration: PASS (idempotent, RLS on, anon/authenticated denied, removed docs excluded, language filter, atomic upsert/version/removal RPCs, input validation)"
