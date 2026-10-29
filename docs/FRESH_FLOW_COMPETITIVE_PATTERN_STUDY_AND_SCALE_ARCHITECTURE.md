# Fresh Flow Competitive Pattern Study and Scale Architecture

**Status:** Research and architecture proposal; not a claim that the proposed capabilities are implemented.  
**Scope:** Fresh Flow at `/fresh-flow`. Preserve the global Fresh Web Lite Home and its existing Fresh Flow entry point.

## Executive decision

Fresh Flow should not be a clone of TikTok, Facebook, Instagram, or YouTube. It should combine proven media patterns from all four while avoiding a fixed taxonomy that forces every future media type into today's six destinations.

Build a **format-flexible media ecosystem** with:
- one Fresh Flow home and consistent navigation;
- multiple discovery modes, not one algorithmic feed;
- a universal content model that can represent short video, long video, posts, images, stories, live sessions, audio, podcasts, immersive/interactive experiences, and future formats;
- creator, community, viewing, search, and safety tools that work across formats;
- feature flags and service-readiness states so unavailable backend features are not presented as live.

This document is a design direction, not authorization to replace the global Home or to claim unbuilt features are live.

## What the platforms teach us

### TikTok — fast discovery and feedback

Patterns worth studying:
- A personalized For You stream alongside Following and other distinct feeds.
- Recommendations informed by watch behavior, likes, comments, shares, content metadata, language/device context, and explicit feedback.
- Controls such as “Not interested,” topic preferences, keyword filters, and feed refresh.
- Search and creator insights connected to what people are actively looking for.
- Short video as a strong entry point, while supporting longer storytelling and LIVE.

Fresh Flow lesson: discovery should be fast and relevant, but users must be able to steer it. Do not make the entire product a single vertical video stream. Give people a visible way to switch to Following, Latest, topics, saved items, and other discovery modes; explain recommendations where possible.

### Facebook — relationships, groups, formats, and utility

Patterns worth studying:
- A broad social graph and feed spanning text, photos, video, and other post types.
- Groups and community spaces, events, sharing, messaging, and local/marketplace-style utility.
- Reels and long-form media alongside ordinary social posts.
- Creator monetization and professional dashboards that cover more than one content format.

Fresh Flow lesson: media needs context and relationships. Let people follow creators, join topic communities, discuss and share content, and move from a media item into a community without losing their place. Do not force every action into a video-only interface.

### Instagram — visual identity and connected capture formats

Patterns worth studying:
- A strong visual profile and creator identity.
- Reels, Stories, photo/carousel posts, Live, messaging, and discovery working together.
- Lightweight creation and remix/collaboration patterns.
- Connections between short clips and emerging longer episodic formats.

Fresh Flow lesson: a creator profile should feel like a coherent body of work, not a list of isolated uploads. Support series, collections, multi-image posts, ephemeral formats if product policy supports them, and clear routes between viewing, messaging, and creator pages.

### YouTube — depth, intent, and a content library

Patterns worth studying:
- Shorts and long-form video living in the same ecosystem.
- Search, subscriptions, recommendations, playlists, channels, podcasts, Live, and community.
- Persistent creator libraries and series/episode organization.
- Creator analytics, production tools, audience controls, and monetization surfaces.
- Customizable feeds and AI-assisted discovery/creation are evolving patterns, not assumptions that Fresh Flow can implement immediately.

Fresh Flow lesson: content should be discoverable today and useful again later. Build search, topic/category metadata, playlists/collections, series/episodes, transcripts/captions where available, and stable creator libraries—not just an endless feed.

## Strategic comparison

| Platform pattern | Strength to learn from | Common trade-off to avoid | Fresh Flow direction |
|---|---|---|---|
| TikTok-style discovery | Quick relevance and low-friction viewing | One feed can dominate the whole experience | Multiple feed modes and explicit user controls |
| Facebook-style social utility | Communities, relationships, varied posts | Broad surface area can feel crowded | Contextual navigation and clear community destinations |
| Instagram-style visual identity | Strong profiles and easy visual sharing | Different formats can feel siloed | One creator identity and cross-format collections |
| YouTube-style library | Search, depth, long-form, playlists | Finding something new can require deliberate search | Blend discovery with searchable, organized libraries |
| Fresh Flow ambition | Formats and destinations can expand over time | “Unlimited” can become a confusing menu | Open content schema + stable entry points + searchable taxonomy |

## Fresh Flow information architecture

Keep the six current destinations as **entry points**, not the complete list of possible media types:

1. **Shorts** — short vertical clips, remixes, short episodes.
2. **Long Videos** — films, tutorials, documentaries, shows, series and episodes.
3. **News & Posts** — articles, updates, text, images, carousels and topic discussions.
4. **AR/VR** — immersive media and interactive 3D experiences where supported.
5. **Podcasts** — audio shows, episodes, clips, transcripts, and listening queues.
6. **Others** — a flexible discovery gateway for new or cross-format experiences; it must not become a permanent dumping ground.

Shared destinations should remain available across worlds:
- **Discover**: personalized, trending, latest, topic-based and local-to-user only when location permission and relevance justify it.
- **Following**: content from followed creators and communities.
- **Search**: people, topics, media, series, audio, live rooms and communities, with type filters.
- **Saved / Library**: bookmarks, playlists, collections, listening/watching history and continue-watching where appropriate.
- **Create**: choose a format first, then enter a format-aware creation flow.
- **Live**: discover live sessions and join/host only when the actual live provider, permissions and safety flows are operational.
- **Profile / Creator Studio**: identity, published work, drafts, audience insights and settings, with unavailable metrics clearly marked.

Do not add all of these as tiny permanent bottom tabs on mobile. Use a small primary navigation and put secondary destinations in contextual controls, a library/profile area, or a discoverable menu. Preserve readable touch targets and avoid clipped controls on small screens.

## Shared content model (conceptual)

Every media object should have a stable ID, creator/owner, content type, title/caption, description, created/updated timestamps, visibility, audience/safety status, language, topic tags, media assets, accessibility metadata, interaction permissions, and provenance.

Optional format-specific fields can include:
- video: duration, aspect ratio, playback variants, captions, chapters, series/episode;
- image/carousel: ordered assets and alt text;
- article/post: structured text, attachments, citations;
- audio/podcast: duration, show/episode IDs, transcript, playback position;
- live: provider/session ID, scheduled/started/ended state, moderation configuration;
- immersive: experience manifest, supported devices, permissions and interaction model;
- future formats: versioned extension metadata, rather than adding a new hard-coded navigation root for every type.

Use explicit capability registration and schema validation. A media type should appear only when the app has a working renderer, permission/safety rules, and required backend capability. A card or demo is not proof that publishing, playback, streaming, analytics, or payouts work.

## Discovery and ranking principles

1. Blend relevance, freshness, creator diversity, quality signals, explicit user interests and content safety; do not optimize solely for watch time.
2. Provide Following and Latest alternatives to personalized discovery.
3. Offer “Why am I seeing this?”, “Not interested,” topic controls, mute/block/report, and feed reset where feasible.
4. Avoid presenting raw views or engagement as proof of quality, authenticity or earnings.
5. Prevent repetitive recommendations and give new creators a fair discovery path without promising reach.
6. Use real user and content data only with appropriate consent and privacy controls. Never seed fake engagement to make a feed look alive.
7. Design for low-bandwidth Android: lazy-load media, responsive thumbnails, adaptive playback when available, save-for-later where supported, clear loading/retry states, and a text-first fallback.

## Creator lifecycle

A coherent path should connect:
**Idea → Create/import → Edit → Accessibility and policy checks → Draft → Preview → Publish/schedule (only if supported) → Distribution → Community interaction → Analytics → Monetization eligibility/status.**

Creator tools should be shared across formats but expose only relevant controls for each format. Show real metrics and explain definitions. Clearly distinguish estimated earnings, approved earnings, and payouts; never imply money has been earned or paid unless the backend confirms it.

## UI and interaction audit requirements

Before changing the existing route:
- capture current `/fresh-flow` and global Home screenshots at 320, 360, 390 and 430 CSS-pixel widths, plus a desktop width;
- inspect loading, empty, offline, error, permission-denied, signed-out and signed-in states;
- trace every nav item and major action to its route or handler;
- compare the actual Figma “Discover everything” frame with the current Shorts-first hub;
- map each design component to the existing implementation before editing;
- verify keyboard/focus visibility, screen-reader names, contrast, reduced motion, touch target size, and safe-area padding;
- preserve the global Home and all unrelated routes.

Figma canvas inspection was blocked by the integration's Starter-plan call limit during the initial audit. Therefore no claim is made that the Figma frames were visually inspected or that production screenshots were captured.

## Implementation order

### Phase 1 — observe and protect
- Record baseline screenshots and routes.
- Inventory existing components, feature registry entries, API dependencies, and real backend readiness.
- Keep changes scoped to `/fresh-flow` and its child components.

### Phase 2 — establish the shared shell
- Refine the Fresh Flow home/discover screen without replacing the global Home.
- Provide readable primary navigation and consistent search/create/profile access.
- Add explicit feed modes and robust empty/loading/offline states.
- Keep the six current worlds visible as useful shortcuts while making taxonomy extensible.

### Phase 3 — connect content worlds
- Reuse common content cards, creator identity, save/share/report actions and accessibility patterns.
- Add format-specific renderers only when the real data contract and service exist.
- Ensure search, profiles and collections can cross media types.

### Phase 4 — creator and community workflows
- Connect actual drafts, publishing, comments/moderation, creator library and analytics APIs.
- Gate Live, AR/VR, payouts and advanced creator tools on verified service readiness.
- Test authorization, ownership, abuse controls and failure handling.

### Phase 5 — validate and release
- Run unit/type/lint/build tests and relevant automated route/interaction tests.
- Capture before/after screenshots at required viewports and compare with design frames.
- Verify production deployment and real end-to-end flows before calling any capability complete.

## Source notes

Official product explanations used for pattern research:
- TikTok, “How content is recommended across TikTok”: https://support.tiktok.com/en/using-tiktok/exploring-videos/how-tiktok-recommends-content
- TikTok, “Introducing the New Creator Rewards Program” (2024): https://newsroom.tiktok.com/introducing-the-new-creator-rewards-program
- Meta, “Creator Fast Track” (March 2026): https://about.fb.com/news/2026/03/creator-fast-track-grow-your-audience-earn-money-on-facebook/
- Meta, “Introducing Creator Assistant” (June 2026): https://about.fb.com/news/2026/06/creator-assistant-more-languages-for-ai-translations-on-facebook/
- YouTube, “Innovation for the YouTube Era: What’s new for viewers and creators” (September 2026): https://blog.youtube/news-and-events/innovation-youtube-era-made-on-viewers-creators/
- Instagram long-form video developments (October 2026 reporting): https://www.theverge.com/tech/1018688/instagram-longform-widescreen-video-features-youtube

Platform capabilities and rollout vary by account, region, and time. The comparison above is about product patterns, not a claim that every feature is available everywhere.
