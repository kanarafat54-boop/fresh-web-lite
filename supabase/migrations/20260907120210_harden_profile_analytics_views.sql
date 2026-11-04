-- Restored from production schema (20260907120210): profile analytics views (security_invoker), plus the follows table they read
-- The original SQL for this version was never committed (placeholder). This file reconstructs the effective
-- end-state of the objects it introduced, from production catalogs read on 2026-10-23/24. Production has
-- already applied this version, so it will not re-run there. Everything below is idempotent.
-- Reconstruction note: statement-level history is not recoverable; final definitions are used.

create table if not exists public.follows (
  follower_id uuid not null,
  followed_id uuid not null,
  created_at timestamp with time zone default now(),
  constraint follows_check CHECK ((follower_id <> followed_id)),
  constraint follows_pkey PRIMARY KEY (follower_id, followed_id)
);

-- Bring a pre-existing, older-shaped table up to the production column set (no-ops where present).
alter table public.follows add column if not exists follower_id uuid not null;
alter table public.follows add column if not exists followed_id uuid not null;
alter table public.follows add column if not exists created_at timestamp with time zone default now();

-- Foreign keys: added only when missing; skipped (with a notice) if a referenced table does not exist yet.
do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('follows', 'follows_followed_id_fkey', 'FOREIGN KEY (followed_id) REFERENCES public.users(id) ON DELETE CASCADE'),
      ('follows', 'follows_follower_id_fkey', 'FOREIGN KEY (follower_id) REFERENCES public.users(id) ON DELETE CASCADE')
    ) as v(tbl, conname, def)
  loop
    if to_regclass('public.' || quote_ident(r.tbl)) is null then continue; end if;
    if exists (select 1 from pg_constraint where conname = r.conname and conrelid = to_regclass('public.' || quote_ident(r.tbl))) then continue; end if;
    begin
      execute format('alter table public.%I add constraint %I %s', r.tbl, r.conname, r.def);
    exception when undefined_table or undefined_column then
      raise notice 'skipped foreign key %: referenced object missing', r.conname;
    end;
  end loop;
end
$$;

CREATE INDEX IF NOT EXISTS follows_followed_idx ON public.follows USING btree (followed_id);

alter table public.follows enable row level security;

drop policy if exists "Follows are viewable by everyone" on public.follows;
create policy "Follows are viewable by everyone" on public.follows for select to public
  using (true);

drop policy if exists "Users can follow others" on public.follows;
create policy "Users can follow others" on public.follows for insert to public
  with check (auth.uid() = follower_id);

drop policy if exists "Users can unfollow" on public.follows;
create policy "Users can unfollow" on public.follows for delete to public
  using (auth.uid() = follower_id);

create or replace view public.user_content_analytics with (security_invoker = true) as
 SELECT u.id AS user_id,
    COALESCE(s.short_count, 0::bigint) AS short_count,
    COALESCE(s.short_views, 0::bigint) AS short_views,
    COALESCE(s.short_likes, 0::bigint) AS short_likes,
    COALESCE(s.short_reposts, 0::bigint) AS short_reposts,
    COALESCE(p.post_count, 0::bigint) AS post_count,
    COALESCE(p.post_likes, 0::bigint) AS post_likes,
    COALESCE(g.gifts_received_count, 0::bigint) AS gifts_received_count,
    COALESCE(g.gifts_received_minor, 0::numeric)::bigint AS gifts_received_minor,
    COALESCE(fol.follower_count, 0::bigint) AS follower_count,
    COALESCE(fing.following_count, 0::bigint) AS following_count
   FROM users u
     LEFT JOIN ( SELECT shorts.author_id,
            count(*) AS short_count,
            sum(shorts.view_count) AS short_views,
            sum(shorts.like_count) AS short_likes,
            sum(shorts.repost_count) AS short_reposts
           FROM shorts
          GROUP BY shorts.author_id) s ON s.author_id = u.id
     LEFT JOIN ( SELECT posts.author_id,
            count(*) AS post_count,
            sum(posts.like_count) AS post_likes
           FROM posts
          GROUP BY posts.author_id) p ON p.author_id = u.id
     LEFT JOIN ( SELECT short_gifts.recipient_id,
            count(*) AS gifts_received_count,
            sum(short_gifts.amount_minor) AS gifts_received_minor
           FROM short_gifts
          GROUP BY short_gifts.recipient_id) g ON g.recipient_id = u.id
     LEFT JOIN ( SELECT follows.followed_id,
            count(*) AS follower_count
           FROM follows
          GROUP BY follows.followed_id) fol ON fol.followed_id = u.id
     LEFT JOIN ( SELECT follows.follower_id,
            count(*) AS following_count
           FROM follows
          GROUP BY follows.follower_id) fing ON fing.follower_id = u.id;

create or replace view public.user_reputation with (security_invoker = true) as
 SELECT user_id,
    (floor(short_views::numeric / 100.0) + ((short_likes + short_reposts * 2 + post_likes) * 2)::numeric + (gifts_received_count * 10)::numeric + (follower_count * 5)::numeric)::integer AS reputation_score
   FROM user_content_analytics;

create or replace view public.universal_profile_stats with (security_invoker = true) as
 SELECT u.id AS user_id,
    u.username,
    u.full_name,
    COALESCE(shorts_agg.short_count, 0::bigint) AS short_count,
    COALESCE(posts_agg.post_count, 0::bigint) AS post_count,
    COALESCE(shorts_agg.short_likes, 0::bigint) + COALESCE(posts_agg.post_likes, 0::bigint) AS total_likes_received,
    COALESCE(shorts_agg.short_comments, 0::bigint) + COALESCE(posts_agg.post_comments, 0::bigint) AS total_comments_received,
    COALESCE(shorts_agg.short_reposts, 0::bigint) AS total_reposts_received,
    COALESCE(gifts_agg.gift_count, 0::bigint) AS gifts_received_count,
    COALESCE(gifts_agg.gift_total_minor, 0::numeric) AS gifts_received_total_minor,
    COALESCE(followers_agg.follower_count, 0::bigint) AS follower_count,
    COALESCE(following_agg.following_count, 0::bigint) AS following_count,
    (COALESCE(shorts_agg.short_count, 0::bigint) + COALESCE(posts_agg.post_count, 0::bigint)) * 2 + COALESCE(shorts_agg.short_likes, 0::bigint) + COALESCE(posts_agg.post_likes, 0::bigint) + (COALESCE(shorts_agg.short_comments, 0::bigint) + COALESCE(posts_agg.post_comments, 0::bigint)) * 2 + COALESCE(shorts_agg.short_reposts, 0::bigint) * 3 + COALESCE(gifts_agg.gift_count, 0::bigint) * 5 + COALESCE(followers_agg.follower_count, 0::bigint) AS reputation_score
   FROM users u
     LEFT JOIN ( SELECT shorts.author_id,
            count(*) AS short_count,
            sum(shorts.like_count) AS short_likes,
            sum(shorts.comment_count) AS short_comments,
            sum(shorts.repost_count) AS short_reposts
           FROM shorts
          GROUP BY shorts.author_id) shorts_agg ON shorts_agg.author_id = u.id
     LEFT JOIN ( SELECT posts.author_id,
            count(*) AS post_count,
            sum(posts.like_count) AS post_likes,
            sum(posts.comment_count) AS post_comments
           FROM posts
          GROUP BY posts.author_id) posts_agg ON posts_agg.author_id = u.id
     LEFT JOIN ( SELECT short_gifts.recipient_id,
            count(*) AS gift_count,
            sum(short_gifts.amount_minor) AS gift_total_minor
           FROM short_gifts
          GROUP BY short_gifts.recipient_id) gifts_agg ON gifts_agg.recipient_id = u.id
     LEFT JOIN ( SELECT follows.followed_id,
            count(*) AS follower_count
           FROM follows
          GROUP BY follows.followed_id) followers_agg ON followers_agg.followed_id = u.id
     LEFT JOIN ( SELECT follows.follower_id,
            count(*) AS following_count
           FROM follows
          GROUP BY follows.follower_id) following_agg ON following_agg.follower_id = u.id;
