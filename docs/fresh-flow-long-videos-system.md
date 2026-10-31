# Fresh Flow Long Videos — Product and Engineering Contract

**Status:** in active implementation on `feat/fresh-flow-long-videos-system` (PR #184). This document distinguishes working integrations from catalog/backend capabilities that are not yet connected.

## Product direction

- Hybrid product: dedicated long-form discovery and cinema experience, reusing Fresh Flow, Fresh ID, Creator Studio, comments, profiles and notifications.
- Two discovery modes: recommendation-led discovery and deliberate browsing/search.
- Cinema player: long-form playback with a focused overlay; never reuse the vertical Fresh Shorts pager.
- Mobile-first, accessible tap targets, readable text, keyboard support and responsive layouts.
- Preserve Fresh Shorts, the Fresh Flow landing page, global Fresh Web Lite Home and existing global navigation.

## Screen inventory

1. **Discover** — latest published video, continue watching and category-led discovery. Personalized recommendation ranking is not yet connected; the current default order is newest first.
2. **Explore** — Movies & Series, Documentaries, Education and Events filters. These are currently metadata/keyword filters over published video posts, not a licensed catalog.
3. **Search** — title, creator and topic search across the currently loaded published video set.
4. **Cinema Player** — native browser video controls, fullscreen support, playback speed preference, autoplay/data-saver preferences, reactions, share, close and resume. When the current video belongs to a creator series, the player shows its series/season/episode position and offers previous/next episode navigation across season boundaries. Navigation preserves the outgoing video's watch progress; it does not invent episodes when linked video posts are unavailable.
5. **Video Details** — title, description, creator entry, reactions, share, watch-later and comments.
6. **Creator Channel** — dedicated channel surface with the creator's published long videos, follow/unfollow action and a handoff to the main Fresh ID profile.
7. **Your Library** — Watch Later, Continue Watching, Recently Watched and personal playlists. Saved posts, watch progress, history and playlist items sync for signed-in users; guest saves/progress remain device-local.
8. **Upload & Publish** — opens existing Creator Studio with a long-video create intent. Long-video publishing now stores title, description, category, tags, custom thumbnail URL, public/unlisted visibility, and an optional scheduled timestamp on the existing post row. Scheduled posts remain owner-visible and become publicly discoverable after their timestamp. Uploads use the existing `post-videos` bucket and `posts.video_url` contract. Long Video transfers use Supabase Storage TUS with 6 MiB chunks, server-confirmed offsets, same-tab session recovery and visible progress. Product contract: one video up to 5 GB (5,000,000,000 bytes). The uploader checks the TUS server's advertised maximum before creating a new upload session.
9. **Creator Studio** — existing creator dashboard; long-video entry opens the Publish tab.
10. **Movies & Series** — creator-owned series, seasons and numbered episodes are stored in `fresh_video_series`, `fresh_video_seasons`, and `fresh_video_episodes`. Creators can create a private series, add their own published videos as episodes, and change series visibility. Public series and their published episodes appear in Long Videos discovery. This is creator-owned organization, not a licensed film catalogue.
11. **Fresh AI** — uses the existing global Fresh AI entry; long-video-specific assistant context is future work.
12. **Monetization** — remains in the existing Creator Studio Monetize tab, reached through the shared Creator Studio navigation; long-video-specific revenue attribution is future work.
13. **Notifications** — uses the existing platform notification center; no duplicate Long Videos notification navigation is added.
14. **Settings** — Long Videos playback preferences: autoplay, data saver and preferred playback speed.

These are contextual product surfaces, not fourteen new global navigation destinations. The Long Videos toolbar stays compact; Creator Studio, Fresh AI and Fresh Mail/notifications continue to use shared platform navigation.

## Current data contracts

- Discovery currently sorts the latest public video posts newest first; it does not claim a personalized ranking model. It reads `public.posts` including the long-video metadata columns `video_title, video_description, video_category, video_tags, video_thumbnail_url, video_duration_seconds, video_visibility, video_status, video_scheduled_at, video_published_at`.
- Creator display names/usernames come from `public.user_public_profiles`.
- Following uses the existing Fresh Flow social author helper (`getSocialAuthorIds`); creator-channel follow/unfollow writes through the existing `public.follows` contract and refreshes the shared social author set.
- Signed-in Watch Later uses `public.saved_posts`, with existing owner-scoped RLS policies. Guest saves are stored locally.
- Signed-in likes use `public.post_likes`; the existing `update_post_like_count()` trigger maintains `posts.like_count`. Guests are directed to Fresh ID sign-in before reacting.
- Share links use `/fresh-flow?videoId=<post-id>`; Fresh Flow routes the link into Long Videos and opens the matching video when it exists in the public library.
- Comments use the existing `CommentPanel` with target type `post`.
- Upload/publish hands off to `/creation` (Creator Studio) with a dedicated **Long Video** publishing mode. It accepts video files only, stores the draft as a post with `media_kind='video'`, uploads to the existing `post-videos` Storage bucket, and publishes through the existing `posts.video_url` contract. Restored creator drafts retain the long-video media kind. Successful publication returns to the Long Videos route.
- Signed-in watch progress is synchronized to `public.fresh_long_video_watch_history` under owner-only RLS. Guest progress remains device-local. Completed videos are retained in history with a completion timestamp.
- `public.fresh_video_playlists` and `public.fresh_video_playlist_items` power playlist creation, listing, adding saved videos, owner-controlled visibility changes (private/unlisted/public), and playlist deletion from Your Library. Deleting a playlist cascades its playlist-item rows but never deletes the underlying videos. Public/unlisted playlist rows are readable under the playlist RLS policy; private playlists remain owner-only.
- Long-video creator analytics use a dedicated private table, `private.fresh_long_video_analytics_sessions`, separate from Shorts' `fresh_creator_analytics`. The public RPC `record_fresh_long_video_watch` validates the authenticated viewer, public/published video state, creator ownership and bounded watch-time increments; self-views are excluded. Viewer identifiers stay in the private schema. The creator-only `get_fresh_long_video_analytics` RPC returns aggregates for a 7–90 day window without exposing viewer IDs.
- A qualified view is one signed-in viewer playback session with at least 2 seconds of accumulated normal forward playback. Unique viewers are distinct Fresh IDs among qualified sessions. Watch time is accumulated from browser playback-time deltas; large seeks/rewinds are ignored, increments are bounded, and rapid duplicate updates are throttled. Completion is recorded from the native video ended event. These are client-reported signals, not fraud-proof server-side media telemetry; guest sessions, creator self-views, impressions, traffic sources and revenue are excluded. Metrics begin after the analytics migration and are not backfilled.
- The Your Library creator snapshot derives the count of currently loaded own video rows, their summed likes/comments, and the most-interacted loaded video from existing owner-visible `posts` rows and persisted `like_count`/`comment_count`; it is a loaded-library snapshot, not a lifetime account total. It explicitly does not label these as views or reach; impression, unique-viewer, watch-time, and revenue metrics are not yet recorded for Long Videos.
- `public.fresh_video_series`, `public.fresh_video_seasons`, and `public.fresh_video_episodes` provide creator-owned series organization. A creator can create a series, add their own published video posts to numbered seasons/episodes, and set series visibility. The database enforces one series per episode video, unique episode numbers per season, series/season consistency, and owner-only writes. Public series/episodes are readable only when the linked episode post is published and publicly/unlisted visible. Series deletion cascades its season/episode metadata but does not delete the underlying video posts.
- Migration `20261030172329_fresh_long_video_library_foundation` adds the long-video metadata, watch-history and playlist schema, and replaces the broad post-video upload policy with a first-folder owner check. Migrations `20261030185415_fresh_long_video_series_episodes`, `20261030185824_harden_long_video_series_policy_indexes`, and `20261030185910_allow_scheduled_video_episodes` add creator-owned series/season/episode data, split owner write policies from public reads, index the season relationship, and respect scheduled-publication times. Migration `20261030213000_fresh_long_video_storage_bucket_provision` also creates or reconciles the `post-videos` bucket on clean local replays before exercising TUS uploads; the earlier metadata migration alone only updated an existing bucket.
- The active Supabase Free organization currently caps individual files at 50 MB, and the `post-videos` bucket is explicitly limited to 50 MiB with an MP4/WebM/QuickTime MIME allowlist. This is below the 5 GB product limit, so files larger than the currently advertised server ceiling are rejected before upload. Raising the bucket limit alone is insufficient: Supabase's global project limit must also support the file. Supabase documents a 50 MB maximum on Free and up to 500 GB on Pro/Team; TUS supports transfers up to 50 GB. The 5 GB product limit is therefore implemented as a guarded contract, but actual 5 GB uploads remain blocked until the connected project has a sufficient plan/global limit and bucket setting. Uploads remain in a public bucket, so unlisted means link-accessible, not private.

## Live backend inspection (2026-10-30)

- `public.posts` exists and has RLS enabled.
- `public.saved_posts` exists and has RLS enabled; SELECT/INSERT/DELETE policies scope rows to `auth.uid() = user_id`.
- `public.follows` and `public.user_public_profiles` are readable under the existing policies used by Fresh Flow.
- `post-videos` and `post-images` Storage buckets exist and are public. The video bucket has a 50 MiB file cap and explicit video MIME allowlist; upload RLS now requires the object path's first folder to equal the authenticated user's ID.
- The live query returned **0 published posts with a valid HTTP(S) video_url** at inspection time. Therefore the correct user-facing state is an honest empty state until a creator publishes a video; do not seed fake videos or pretend sample content is live.
- `fresh_media_assets`, `fresh_media_jobs`, and `fresh_creator_analytics` exist but currently have zero rows. The separate media-job pipeline is not yet connected to this Long Videos experience.
- The only active Supabase Edge Function found during inspection was `noop-check`; do not claim a deployed media-processing edge function.

## Explicitly not claimed

No licensing/catalogue provider, adaptive bitrate streaming, offline downloads, long-video creator analytics, or dedicated long-form media transcoding pipeline is connected by this PR. Creator-owned series, seasons and episode ordering are connected; this is not a third-party film/series catalogue. The product contract allows one video up to 5 GB, but the connected Free project currently enforces a 50 MiB per-video ceiling. A real 5 GB upload requires the Supabase global file limit and bucket limit to be raised on a plan that supports it; this PR does not upgrade the project or incur charges. Private video delivery is not supported while uploads use the public bucket; unlisted videos remain accessible to anyone with the link. Audience/age-gating controls are not implemented.

## Validation and merge rules

- Build must pass.
- Fresh Flow mobile navigation browser test must pass at 320/360/390/430 px.
- Fresh Shorts production gate must pass; do not change Shorts implementation.
- Fresh AI integrity/training contracts and TRUEMODE verification must remain green.
- Vercel and Netlify previews must be successful.
- Do not merge while any required check is failing or pending.
