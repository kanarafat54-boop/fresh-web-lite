#!/usr/bin/env bash
# Replays the real knowledge migrations on a throwaway Postgres and measures how often the correct
# docs section is retrieved for the 428 held-out Fresh questions (data/fresh-eval/). No outside AI.
# Usage: DATABASE_URL=postgres://.../something_test bash scripts/test-fresh-knowledge-retrieval.sh
set -euo pipefail
: "${DATABASE_URL:?set DATABASE_URL to a throwaway database whose name ends in _test}"
case "$DATABASE_URL" in *_test|*_test\?*) ;; *) echo "refusing: database name must end in _test" >&2; exit 2;; esac
MIN_HIT1="${MIN_HIT1:-0.72}"   # the right section is first
MIN_HIT4="${MIN_HIT4:-0.97}"   # the right section is among the 4 sections handed to the answer
export PGOPTIONS='-c client_min_messages=warning'
psql="psql $DATABASE_URL -q -At -v ON_ERROR_STOP=1"
tmp="$(mktemp)"; trap 'rm -f "$tmp"' EXIT

$psql <<'SQL'
drop schema if exists public cascade; create schema public;
do $$ begin create role anon; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated; exception when duplicate_object then null; end $$;
do $$ begin create role service_role; exception when duplicate_object then null; end $$;
create extension if not exists pgcrypto;
create table public.fresh_ai_knowledge(id uuid primary key default gen_random_uuid(), user_id uuid, project_id text not null, title text not null, content text not null, modality text default 'text', source text, provenance jsonb default '{}', truth_state text default 'PROBABLE', confidence numeric default 0.75, metadata jsonb default '{}', created_at timestamptz default now(), updated_at timestamptz default now());
SQL
for f in 20261014140300_fresh_ai_full_text_search 20261021200000_fresh_ai_platform_docs_knowledge 20261111120000_fresh_ai_knowledge_search_v2; do
  $psql -f "supabase/migrations/$f.sql" >/dev/null
done

node -e '
const fs=require("fs");const esc=(s)=>`"${String(s).replace(/"/g,"\"\"")}"`;
const rows=fs.readFileSync("data/fresh-eval/fresh-knowledge-recall-v1.jsonl","utf8").trim().split("\n").map(JSON.parse);
fs.writeFileSync(process.argv[1],rows.map(r=>[r.id,r.input,r.reference].map(esc).join(",")).join("\n")+"\n");
' "$tmp"
$psql -c "create table ev(id text, q text, ref text)"
$psql -c "\\copy ev from '$tmp' csv"

result="$($psql <<'SQL'
with r as (
  select (select min(x.ord) from (select s.content, row_number() over () as ord from public.search_fresh_platform_knowledge(ev.q, 4) s) x where x.content = ev.ref) as pos
  from ev)
select count(*)||'|'||round(avg((pos = 1)::int), 3)||'|'||round(avg((pos is not null)::int), 3) from r;
SQL
)"
IFS='|' read -r n hit1 hit4 <<<"$result"
echo "questions=$n hit@1=$hit1 hit@4=$hit4 (floors: $MIN_HIT1 / $MIN_HIT4)"
awk -v a="$hit1" -v b="$MIN_HIT1" -v c="$hit4" -v d="$MIN_HIT4" 'BEGIN{exit !(a>=b && c>=d)}' || { echo "FAIL: retrieval below floor" >&2; exit 1; }
echo "PASS"
