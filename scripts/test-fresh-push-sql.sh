set -e
D=/var/tmp/pgpush; rm -rf $D; mkdir -p $D; chown postgres $D
B=/usr/lib/postgresql/16/bin
su postgres -c "$B/initdb -D $D -A trust >/dev/null"
su postgres -c "$B/pg_ctl -D $D -o '-p 55442 -k /var/tmp' -l $D/log -w start >/dev/null"
P="psql -h 127.0.0.1 -p 55442 -U postgres -v ON_ERROR_STOP=1 -q -t -A"
$P -d postgres <<SQL
create role anon; create role authenticated;
create schema auth; create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql as \$\$ select null::uuid \$\$;
create schema extensions; create schema net; create schema vault;
create function net.http_post(url text, headers jsonb, body jsonb) returns bigint language plpgsql as \$\$ begin insert into public.kick_log(url, secret) values (url, headers->>'x-fresh-push-secret'); return 1; end \$\$;
create view vault.decrypted_secrets as select 'fresh_push_secret'::text as name, 'shh'::text as decrypted_secret where current_setting('app.has_secret', true) = 'yes';
create table public.kick_log (url text, secret text);
create table public.users (id uuid primary key references auth.users(id), full_name text, username text);
create table public.shorts (id uuid primary key default gen_random_uuid(), author_id uuid, remix_of_short_id uuid, duet_of_short_id uuid);
create table public.short_likes (short_id uuid, user_id uuid, primary key (short_id, user_id));
create table public.short_comments (id uuid primary key default gen_random_uuid(), short_id uuid, author_id uuid, parent_id uuid, body text default '', content text default '', moderation_state text default 'visible');
create table public.short_reposts (short_id uuid, user_id uuid);
create table public.short_gifts (id uuid primary key default gen_random_uuid(), short_id uuid, sender_id uuid, recipient_id uuid);
create table public.follows (follower_id uuid, followed_id uuid, primary key (follower_id, followed_id));
create table public.user_restrictions (restrictor_id uuid, restricted_id uuid);
create table public.short_privacy_settings (user_id uuid primary key, quiet_enabled boolean default false);
create table public.short_notification_state (user_id uuid primary key, disabled_categories text[] default '{}');
SQL
$P -d postgres -f supabase/migrations/20261115100000_fresh_push_subscriptions.sql
# pg_net is not available in the throwaway server; the migration's create extension must be the only thing skipped.
sed 's/^create extension if not exists pg_net.*$//' supabase/migrations/20261115120000_fresh_push_outbox.sql > /var/tmp/outbox_nopgnet.sql
$P -d postgres -f /var/tmp/outbox_nopgnet.sql
$P -d postgres -f /var/tmp/outbox_nopgnet.sql   # idempotent
$P -d postgres -f supabase/migrations/20261115140000_fresh_push_deeplinks_and_more_triggers.sql
$P -d postgres -f supabase/migrations/20261115140000_fresh_push_deeplinks_and_more_triggers.sql
SUB="'https://push.example.com/'||repeat('a',30), repeat('p',87), repeat('b',22)"
$P -d postgres <<SQL
insert into auth.users select gen_random_uuid() from generate_series(1,5);
create temp table u as select id, row_number() over (order by id) n from auth.users;
insert into public.users select id, case n when 1 then 'Ana Owner' when 2 then 'Ben' else null end, 'user'||n from u;
insert into public.shorts (id, author_id) select '11111111-1111-1111-1111-111111111111', id from u where n=1;
-- user 1 (the author) has a device; user 4 has none
insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) select id, $SUB from u where n=1;
insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) select id, 'https://push.example.com/'||repeat('c',30), repeat('p',87), repeat('b',22) from u where n=2;
SQL
q() { echo "$1 -> $($P -d postgres -c "$2" | tr '\n' '|')"; }
U() { echo "(select id from u where n=$1)"; }
$P -d postgres -c "create temp table u as select id, row_number() over (order by id) n from auth.users;" >/dev/null 2>&1 || true
# helper tables persist: recreate non-temp for later calls
$P -d postgres -c "create table public.u as select id, row_number() over (order by id) n from auth.users;"
UID1="(select id from public.u where n=1)"; UID2="(select id from public.u where n=2)"; UID3="(select id from public.u where n=3)"; UID4="(select id from public.u where n=4)"
SH="'11111111-1111-1111-1111-111111111111'"
$P -d postgres -c "insert into public.short_likes values ($SH, $UID2)"
q "like by Ben notifies author" "select user_id=$UID1, category, body from public.push_outbox order by id desc limit 1"
$P -d postgres -c "insert into public.short_likes values ($SH, $UID4)"
q "like by user with no name uses username" "select body from public.push_outbox order by id desc limit 1"
$P -d postgres -c "insert into public.short_likes values ($SH, $UID1)"
q "own like adds nothing (expect 2)" "select count(*) from public.push_outbox"
$P -d postgres -c "insert into public.short_comments (id, short_id, author_id, content) values ('22222222-2222-2222-2222-222222222222', $SH, $UID2, 'Great one')"
q "comment" "select category, body from public.push_outbox order by id desc limit 1"
$P -d postgres -c "insert into public.short_comments (short_id, author_id, parent_id, content) values ($SH, $UID1, '22222222-2222-2222-2222-222222222222', 'Thanks')"
q "reply to Ben (Ben has a device)" "select category, body, user_id=$UID2 from public.push_outbox order by id desc limit 1"
$P -d postgres -c "insert into public.short_comments (short_id, author_id, content, moderation_state) values ($SH, $UID3, 'spam', 'hidden')"
q "hidden comment adds nothing (expect 4)" "select count(*) from public.push_outbox"
$P -d postgres -c "insert into public.follows values ($UID2, $UID1)"
q "follow" "select category, body from public.push_outbox order by id desc limit 1"
$P -d postgres -c "insert into public.user_restrictions values ($UID1, $UID3); insert into public.short_likes values ($SH, $UID3)"
q "restricted actor adds nothing (expect 5)" "select count(*) from public.push_outbox"
$P -d postgres -c "insert into public.short_notification_state values ($UID1, '{reactions}'); insert into public.short_likes select $SH, id from auth.users where id not in (select id from public.u where n in (1,2,3,4))"
q "disabled category adds nothing (expect 5)" "select count(*) from public.push_outbox"
$P -d postgres -c "insert into public.short_privacy_settings values ($UID1, true)"
$P -d postgres -c "insert into public.short_comments (short_id, author_id, content) values ($SH, $UID2, 'quiet?')"
q "quiet mode adds nothing (expect 5)" "select count(*) from public.push_outbox"
q "kick log without secret (expect 0)" "select count(*) from public.kick_log"
$P -d postgres -c "alter database postgres set app.has_secret='yes'"
P2="psql -h 127.0.0.1 -p 55442 -U postgres -v ON_ERROR_STOP=1 -q -t -A"
$P2 -d postgres -c "delete from public.short_privacy_settings; insert into public.short_comments (short_id, author_id, content) values ($SH, $UID2, 'now allowed')"
q "kick with secret" "select count(*)>0, bool_and(secret='shh'), bool_and(url like '%__fresh_push=1') from public.kick_log"
q "anon/authenticated cannot read outbox" "select has_table_privilege('authenticated','public.push_outbox','select') or has_table_privilege('anon','public.push_outbox','select')"
q "cannot call enqueue directly" "select has_function_privilege('authenticated','public.push_enqueue(uuid,uuid,text,text,text,text,text)','execute')"

echo "--- follow-up migration ---"
q "like links to the short" "select url from public.push_outbox where category='reactions' order by id limit 1"
$P -d postgres -c "delete from public.push_outbox; delete from public.short_privacy_settings; delete from public.user_restrictions; delete from public.short_notification_state"
$P -d postgres -c "insert into public.short_reposts values ($SH, $UID2)"
q "repost -> creator + link" "select category, body, url from public.push_outbox order by id desc limit 1"
$P -d postgres -c "insert into public.shorts (id, author_id, remix_of_short_id) values ('33333333-3333-3333-3333-333333333333', $UID2, $SH)"
q "remix -> creator, links to the new short" "select category, body, url from public.push_outbox order by id desc limit 1"
$P -d postgres -c "insert into public.shorts (author_id, duet_of_short_id) values ($UID2, $SH)"
q "duet wording" "select body from public.push_outbox order by id desc limit 1"
$P -d postgres -c "insert into public.shorts (author_id) values ($UID2)"
q "plain short adds nothing (expect 4)" "select count(*) from public.push_outbox"
$P -d postgres -c "insert into public.short_gifts (short_id, sender_id, recipient_id) values ($SH, $UID2, $UID1)"
q "gift" "select category, body from public.push_outbox order by id desc limit 1"
$P -d postgres -c "delete from public.push_outbox"
$P -d postgres -c "insert into public.short_comments (short_id, author_id, content) values ($SH, $UID4, 'hey @user2 and @USER2 and @nobody and @user1 look')"
q "mentions: user2 once, author gets comment + no duplicate mention (expect 2 rows)" "select count(*) from public.push_outbox"
q "mention row" "select category, user_id=$UID2, body from public.push_outbox where category='mentions'"
q "author row is the comment, not a mention" "select category from public.push_outbox where user_id=$UID1"
$P -d postgres -c "delete from public.push_outbox; insert into public.short_comments (short_id, author_id, content) values ($SH, $UID4, 'no handles here, a@b.com is an email')"
q "email is not a mention (expect 1 row: the comment)" "select count(*) from public.push_outbox"
# a failing queue must not block the like
$P -d postgres -c "alter table public.push_outbox add constraint boom check (false) not valid" 
$P -d postgres -c "insert into public.short_likes select $SH, gen_random_uuid() where false" 
$P -d postgres -c "insert into public.short_comments (short_id, author_id, content) values ($SH, $UID2, 'still saved')" && echo "comment saved even if queue insert fails"
su postgres -c "$B/pg_ctl -D $D -m immediate stop >/dev/null"
