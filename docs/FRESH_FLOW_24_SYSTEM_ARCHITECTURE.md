# Fresh Flow — 24 Independent Media Systems

**Status:** Approved product architecture; system-specific implementation and production verification remain pending unless independently evidenced elsewhere.
**Parent product:** Fresh Web Lite
**Scope:** Fresh Flow and all media systems reachable within it.
**Architecture rule:** Family grouping organizes discovery; it never merges the products inside a family into a generic screen.

## Product decision

Fresh Flow is the whole-media ecosystem. Its landing page is the unified discovery home and launchpad. The six families below organize the directory. Each of the 24 systems is an independent product experience with its own route contract, purpose-built UI, navigation, discovery behavior, content lifecycle, permissions, accessibility states, and test contract. Systems share platform services and design tokens, but do not collapse into family-level screens.

The global Fresh Web Lite Home remains separate from Fresh Flow Home.

## System registry

### A. Video & Broadcast — 5 systems

1. **Fresh Shorts** — Dedicated immersive short-video experience, discovery, social interactions, creator identity and publishing entry points. Preserve the existing discovery requirements: For You, Following/Social, Trending, Fresh Picks, Learn, Relax, and Filters/Models. These remain modes/tools inside Shorts, not separate systems. Preserve the user's requested left-swipe-to-next and right-swipe-to-previous behavior; audit existing vertical swipe behavior before changing it.
2. **Long Video** — Long-form playback, channels, playlists, chapters, history, recommendations and creator publishing.
3. **Movies & Series** — Film/TV catalog, seasons, episodes, watchlists, resume viewing and rights-aware distribution.
4. **Fresh Live** — Viewer-facing audiovisual live broadcasts, live chat, co-hosts, audience participation, reporting and reconnect behavior.
5. **Sports & Events** — Sports schedules, coverage, scores/highlights, fan experiences and event discovery; live content requires applicable rights/provider support.

### B. Social & Community — 4 systems

6. **Fresh Posts** — Social publishing for text, images, carousels, links, discussions and feed interactions.
7. **Communities** — Member-led groups, forums, topics, roles, moderation and community discovery.
8. **Stories** — Sequential, time-limited updates with audience, privacy and expiry controls.
9. **Creator Channels** — Creator-owned publishing destinations, channel pages, collections, audience relationships and supported subscriptions/memberships.

### C. Audio — 4 systems

10. **Fresh Music** — Music catalog, artist/album pages, playlists, music discovery and playback.
11. **Fresh Podcasts** — Shows, episodes, subscriptions, queues, playback speed and listening progress.
12. **Radio & Audio Live** — Radio/stations, audio-first live rooms and real-time audio broadcasts.
13. **Audiobooks** — Structured spoken books, chapters, bookmarks, playback progress and library management.

### D. Reading, Knowledge & Publishing — 4 systems

14. **Fresh News** — Publisher/source-aware news discovery, topic pages, attribution, context and corrections.
15. **Books & Reading** — Digital books, comics, magazines, reading views, bookmarks and progress.
16. **Learn** — Structured lessons, courses, tutorials, assessments and learning progress.
17. **Research & Knowledge** — Research discovery, source-backed explainers, evidence collections, references and knowledge organization.

### E. Visual & Immersive Media — 4 systems

18. **Images & Art** — Photography, illustration, visual galleries, portfolios and collections.
19. **VR / AR / Spatial** — Virtual, augmented and spatial experiences with device-capability detection and graceful fallbacks.
20. **Interactive Experiences** — Branching narratives, interactive media and participatory experiences with safe execution boundaries.
21. **Gaming & Esports** — Game discovery, esports, game-related media, streams and gaming communities.

### F. Creation & Participation — 3 systems

22. **Fresh Studio** — Cross-system media library, recording/import, editing, effects, captions, drafts, rights/visibility, scheduling and publishing.
23. **Live Creation** — Host/producer control room for broadcast setup, scenes, guests, moderation and stream health. This is the creator-side counterpart to Fresh Live, not a duplicate viewer app.
24. **Events & Performances** — Non-sports event listings, performances, premieres, registration/tickets where supported, and audience participation.

## Boundaries: consolidate infrastructure, not user experiences

- **Fresh Shorts vs Long Video:** immersive short-form playback vs long-form watching.
- **Long Video vs Movies & Series:** general long-form publishing/playback vs structured licensed film/TV catalog and episode model.
- **Fresh Live vs Radio & Audio Live:** audiovisual live broadcasts vs audio-first stations/rooms.
- **Fresh Live vs Live Creation:** audience/viewer product vs creator production control room.
- **Sports & Events vs Events & Performances:** sports-specific coverage/fan workflows vs other scheduled performances and events.
- **Fresh Posts vs Fresh News:** social publishing/conversation vs source-attributed reporting and news discovery.
- **Stories vs Shorts:** expiring updates vs dedicated short-video catalog/feed. Sharing one format into another does not merge their identity.
- **Creator Channels vs Communities:** creator-owned channel/audience relationship vs member-led group spaces.
- **Fresh Music vs Fresh Podcasts vs Audiobooks:** music tracks/albums vs episodic spoken shows vs book/chapter structure.
- **Books & Reading vs Research & Knowledge:** reading published works vs researching, organizing and understanding evidence.
- **Fresh Studio vs Live Creation:** recorded/edited media workflow vs real-time broadcast production.
- **Learn vs Research & Knowledge:** structured learning paths/progress vs open-ended evidence and knowledge exploration.
- **Sports & Events vs Fresh Live:** sports discovery and event-specific context may link to a Fresh Live broadcast, but Fresh Live remains the playback/session system.

## Shared platform capabilities (not additional media systems)

Fresh ID and workspace permissions; universal search; Fresh AI assistance; follows/social graph; notifications; saved items/history; upload and media processing; adaptive playback; captions/transcripts/translation; reporting/moderation/trust; accessibility and localization; creator analytics; rights management; monetization ledger; observability and support. A shared service must authorize requests server-side; a registry entry is not authorization.

## Navigation and discovery

1. **Fresh Flow Home:** personalized cross-media landing page, universal search, prominent create action, followed creators and content/system recommendations.
2. **All Systems directory:** six families with all 24 independent systems; allow search, favorites/pinning and direct entry. Do not put 24 tiny buttons in a single crowded mobile row.
3. **Independent system experiences:** each system owns its layout, contextual navigation, discovery controls, loading/empty/offline/error/retry states, and relevant player/editor/workflow.
4. **Flow Switch:** quick system switching and back-to-home behavior; family grouping is an organizing layer only.
5. **Global Home:** stays outside Fresh Flow and is not replaced by Fresh Flow Home.

The current five-item Fresh Flow bottom navigation proposal (Shorts, Videos, Posts, Create, More) is a compact shortcut set, not the complete system inventory. All Systems must expose every approved system. Do not force a permanent bottom-nav item for every system.

## System contract required before a system is called implemented

Each system needs: stable ID and route; screen map and editable wireframes; prototype journeys; domain/content model; API/data ownership and server authorization; provider/device/rights prerequisites; accessibility/localization; loading, empty, offline, denied-permission, unsupported, validation, retry and error states; unit/contract/integration tests; and actual browser/device/release evidence. Mark status honestly as **Planned**, **Partial**, **Provider/device required**, or **Verified**. Design frames and registry metadata alone do not prove runtime behavior.

## Delivery approach

Architect all 24 systems together; implement in reviewable vertical slices. Reuse existing working components and services where evidence supports reuse, but keep each system's route, UI and contract independent. Do not build 24 disconnected backends or duplicate shared media infrastructure. Inspect the current repository and existing PRs before implementation; preserve existing features and backward-compatible discovery preferences. Do not merge or deploy until checks and the relevant real user journeys are verified.
