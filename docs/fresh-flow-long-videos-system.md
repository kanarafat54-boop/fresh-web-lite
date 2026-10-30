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
4. **Cinema Player** — native browser video controls, fullscreen support, playback speed preference, autoplay/data-saver preferences, reactions, share, close and resume.
5. **Video Details** — title, description, creator entry, reactions, share, watch-later and comments.
6. **Creator Channel** — dedicated channel surface with the creator's published long videos, follow/unfollow action and a handoff to the main Fresh ID profile.
7. **Your Library** — watch-later videos and continue-watching. Saved posts sync for signed-in users; guest saves are local. Watch progress is local.
8. **Upload & Publish** — opens existing Creator Studio with a long-video create intent. The current post publishing path accepts video uploads and writes the published video URL to `posts.video_url`.
9. **Creator Studio** — existing creator dashboard; long-video entry opens the Publish tab.
10. **Movies & Series** — currently a discovery category only. Season/episode metadata and a licensed film catalog are not present in the connected schema.
11. **Fresh AI** — uses the existing global Fresh AI entry; long-video-specific assistant context is future work.
12. **Monetization** — remains in the existing Creator Studio Monetize tab, reached through the shared Creator Studio navigation; long-video-specific revenue attribution is future work.
13. **Notifications** — uses the existing platform notification center; no duplicate Long Videos notification navigation is added.
14. **Settings** — Long Videos playback preferences: autoplay, data saver and preferred playback speed.

These are contextual product surfaces, not fourteen new global navigation destinations. The Long Videos toolbar stays compact; Creator Studio, Fresh AI and Fresh Mail/notifications continue to use shared platform navigation.

## Current data contracts

- Discovery currently sorts the latest public video posts newest first; it does not claim a personalized ranking model. It reads `public.posts`: `id, author_id, content, image_url, video_url, like_count, comment_count, created_at`.
- Creator display names/usernames come from `public.user_public_profiles`.
- Following uses the existing Fresh Flow social author helper (`getSocialAuthorIds`); creator-channel follow/unfollow writes through the existing `public.follows` contract and refreshes the shared social author set.
- Signed-in Watch Later uses `public.saved_posts`, with existing owner-scoped RLS policies. Guest saves are stored locally.
- Signed-in likes use `public.post_likes`; the existing `update_post_like_count()` trigger maintains `posts.like_count`. Guests are directed to Fresh ID sign-in before reacting.
- Share links use `/fresh-flow?videoId=<post-id>`; Fresh Flow routes the link into Long Videos and opens the matching video when it exists in the public library.
- Comments use the existing `CommentPanel` with target type `post`.
- Upload/publish hands off to `/creation` (Creator Studio) with a dedicated **Long Video** publishing mode. It accepts video files only, stores the draft as a post with `media_kind='video'`, uploads to the existing `post-videos` Storage bucket, and publishes through the existing `posts.video_url` contract. Restored creator drafts retain the long-video media kind. Successful publication returns to the Long Videos route.
- Watch progress and guest library state are device-local. There is no server-synced watch-history table in this implementation.

## Live backend inspection (2026-10-30)

- `public.posts` exists and has RLS enabled.
- `public.saved_posts` exists and has RLS enabled; SELECT/INSERT/DELETE policies scope rows to `auth.uid() = user_id`.
- `public.follows` and `public.user_public_profiles` are readable under the existing policies used by Fresh Flow.
- `post-videos` and `post-images` Storage buckets exist and are public.
- The live query returned **0 published posts with a valid HTTP(S) video_url** at inspection time. Therefore the correct user-facing state is an honest empty state until a creator publishes a video; do not seed fake videos or pretend sample content is live.
- `fresh_media_assets`, `fresh_media_jobs`, and `fresh_creator_analytics` exist but currently have zero rows. The separate media-job pipeline is not yet connected to this Long Videos experience.
- The only active Supabase Edge Function found during inspection was `noop-check`; do not claim a deployed media-processing edge function.

## Explicitly not claimed

No licensing/catalogue provider, seasons/episodes, adaptive bitrate streaming, offline downloads, server-synced watch history, long-video creator analytics, or media transcoding pipeline is connected by this PR. These require separately implemented and verified contracts.

## Validation and merge rules

- Build must pass.
- Fresh Flow mobile navigation browser test must pass at 320/360/390/430 px.
- Fresh Shorts production gate must pass; do not change Shorts implementation.
- Fresh AI integrity/training contracts and TRUEMODE verification must remain green.
- Vercel and Netlify previews must be successful.
- Do not merge while any required check is failing or pending.
