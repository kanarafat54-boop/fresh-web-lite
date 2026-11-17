# Fresh Flow Unified Creator Studio — Capability Architecture

Status: architecture baseline for PR #300; not a claim that every editor or provider is implemented.

## 1. Product decision

Fresh Flow has one Creator Studio. Shorts Studio is not a second studio or a competing product destination. Its Shorts-specific dashboard, drafts, publishing, analytics and earnings become a media-domain workspace inside the unified Creator Studio.

The 24 Fresh Flow systems remain independent user-facing media experiences. Creator Studio is their shared production environment: creators enter it from the relevant system, work in the correct domain, and return to that system without losing context.

The design rule is: **one studio shell, multiple domain workspaces, shared production services, independent media-system experiences.**

## 2. Fresh Flow system catalogue

The current registry defines 24 systems in six families:

| Family | Registered systems | Creation implications |
|---|---|---|
| Video & Broadcast | Fresh Shorts; Long Video; Movies & Series; Fresh Live; Sports & Events | Short/long video editing, film/episode production, broadcast control room, sports/event packages and rights-aware publishing |
| Social & Community | Fresh Posts; Communities; Stories; Creator Channels | Text and media composition, carousels, story sequences, group/community publishing, channel collections and audience controls |
| Audio | Fresh Music; Fresh Podcasts; Radio & Audio Live; Audiobooks | Music production and release preparation, podcast recording/editing, audio broadcast production, spoken-word chapter production |
| Reading, Knowledge & Publishing | Fresh News; Books & Reading; Learn; Research & Knowledge | Article/newsroom workflows, book/comic/magazine authoring, course/lesson creation, source-backed research and knowledge publishing |
| Visual & Immersive Media | Images & Art; VR / AR / Spatial; Interactive Experiences; Gaming & Esports | Image/art creation, 3D/spatial scene authoring, branching interactive experiences, game/esports media production |
| Creation & Participation | Fresh Studio; Live Creation; Events & Performances | Shared creator production environment, live-production control room, event/performance planning and publishing |

These are separate destination experiences, not 24 separate studios. The Fresh Studio registry entry should resolve to the one unified Creator Studio.

## 3. Unified Studio information architecture

### A. Studio shell
- Dashboard / workspace switcher
- Create
- Projects and drafts
- Media and asset library
- Review and approvals
- Publish / schedule
- Analytics
- Earnings and monetization
- Settings, permissions and team

### B. Domain workspaces
1. Video: Shorts, long-form, films/series, tutorials, sports/event video.
2. Social: posts, image posts, carousels, stories, community posts and creator-channel content.
3. Audio: music, podcasts, radio/audio-live and audiobooks.
4. Reading & knowledge: news/articles, books, lessons/courses and research collections.
5. Visual & immersive: photography, illustration, graphic design, 3D, AR/VR and spatial scenes.
6. Interactive & gaming: branching experiences, interactive media, game-related media and esports content.
7. Live & events: live broadcast production, performances, premieres and event coverage.

The domain workspace is selected by the user's creation intent or the Fresh Flow system they came from. Do not force every creator through a video-first quick-start screen.

### C. Shared production services
- Capture: camera, microphone, screen capture and file import, each behind explicit permission.
- Editing: domain-appropriate editors; do not show a generic editor as if it can edit every media type.
- AI assistance: generation, transformation, transcription, translation and assistive workflows only where the relevant Fresh AI capability is actually connected and validated.
- Assets: reusable media, project files, fonts, audio, thumbnails, artwork and metadata with ownership and rights context.
- Project lifecycle: draft → in production → review → approved → ready to publish → published / archived, with failure states and version history.
- Collaboration: comments, approvals, roles and shared projects with owner-scoped authorization.
- Distribution: destination-specific packaging, metadata, scheduling and publishing.
- Measurement: analytics tied to the relevant media system and its real data source.
- Monetization: earnings, gifts, subscriptions and wallet ledger views; never fabricate balances or revenue.

## 4. Shorts Studio's place

Shorts remains a first-class domain workspace inside Creator Studio. Preserve its existing:
- Overview and Shorts metrics
- Projects and videos
- Analytics and recent performance
- Earnings sourced from Fresh wallet data
- Create & drafts, including existing publish, remix and duet handoffs

Do not duplicate these capabilities on the unified Studio dashboard. The unified dashboard links into the Shorts workspace; the Shorts workspace owns Shorts-specific metrics and controls.

## 5. Entry and return journeys

- Fresh Flow → Create / camera / template → unified Creator Studio with the correct domain and intent selected.
- Shorts → Create / upload / remix / duet → Creator Studio → Shorts create-and-drafts workflow.
- Long Videos → upload / edit → Creator Studio → long-video publishing workflow.
- Posts, Stories, Podcasts, Music, News, Books, Learn, Images, VR/AR, Interactive and Events → their matching domain workspace.
- Existing project deep links open the same project and domain workspace.
- Returning to Fresh Flow restores the originating media experience and does not strand the creator in a second global Studio.

The global Fresh Web Lite Home and global navigation must not expose a separate Creators/Studio shortcut. The Creator Studio entry remains inside Fresh Flow.

## 6. Existing implementation evidence and gaps

Evidence inspected on branch `feat/fresh-flow-unified-creator-studio-foundation`:
- `freshFlowSystemRegistry.ts` defines the six families and 24 systems.
- `FreshStudioApp.tsx` provides the embedded unified Studio shell and hides its duplicate bottom bar when embedded in Flow.
- `ShortsStudio.tsx` is mounted as the Shorts section within that shell.
- `CreatorStudioDashboard.tsx` currently supplies existing publishing, analytics, distribution, design, audio and monetization pages.
- `CreateProject.tsx` supports video plus image, audio, podcast, 3D/animation, design, live and custom project records.
- `QuickStart.tsx` currently creates video projects only.
- The current Studio home says templates, AI-generated creation inside Studio, shared projects and Team are not yet available.
- The non-video project types are explicitly labelled planning-only; they must not be represented as fully working editors.

Therefore PR #300 establishes the single-shell/navigation foundation, not completion of the full creation ecosystem.

## 7. Implementation sequence

1. Complete and verify the single-shell integration, navigation and legacy-route compatibility in PR #300.
2. Add a typed creation-domain registry that maps the 24 Fresh Flow systems to domain workspace, project kind, supported creation intents and capability status. Keep system IDs and existing routes stable.
3. Build domain-aware entry routing and project metadata compatibility. Preserve old project rows, owner scoping, version checks and RLS; no destructive migration or backfill.
4. Inventory and connect existing editors and creator workflows before building replacements. Reuse the Shorts publisher, Long Video upload, device editor, Director, photo workflows and existing project services.
5. Implement missing domain editors incrementally: social/writing, audio, reading/learning/research, visual/3D/immersive, interactive/gaming and live/events.
6. Integrate Fresh AI only through validated capability contracts; unavailable generation must remain clearly unavailable.
7. Add shared asset, collaboration, review, scheduling, distribution and analytics workflows with real persistence and permissions.
8. Test every entry/return path, small-screen layouts, guest and signed-in states, project ownership, existing drafts, media upload, publishing and regression paths.
9. Merge only after the full required CI and browser checks pass. Production deployment and real provider functionality must be verified separately.

## 8. Non-negotiable safeguards

- One Creator Studio; no parallel Shorts Studio product.
- Keep all 24 Fresh Flow system experiences independent.
- Do not remove existing creation functionality to make the navigation simpler.
- Do not silently rewrite or migrate existing user projects.
- Do not claim planned or placeholder capabilities are operational.
- Keep global Home free of a separate Creators button.
- Keep Fresh Flow navigation and the embedded Studio usable on small Android screens.
- Every server operation must enforce authorization independently of UI visibility.


## 9. Domain-aware project creation handoff

The implementation now includes `freshFlowStudioIntegration.ts`, a typed profile for each of the 24 independent systems. Each profile declares:
- The compatible existing Studio media kind and workspace.
- Creation intents for that domain.
- Capability dependencies that must be fulfilled by real adapters.
- Shared Studio services expected by the domain.
- An explicit implementation state: existing foundation, partial foundation, domain work required, provider required or device required.

When a user enters Creator Studio's Create workflow from an independent Fresh Flow system, the originating system ID is carried through the Flow → Studio handoff. The Create workflow preselects the compatible project kind, and the project service persists the source system ID in Studio project metadata. The project mapper restores it when loading existing records. This adds metadata without a database migration and leaves existing project records unchanged.

The source-system field is routing/context metadata only. It is not authorization, provider availability, publishing permission, or proof that a domain editor is complete.

## Editors and gaps (generated)

Which of the 24 systems open a real editor, and what is still missing for each, is in [fresh-flow-studio-gap-matrix.md](./fresh-flow-studio-gap-matrix.md). It is generated from the profiles and the editor list by `scripts/gen-fresh-studio-gap-matrix.mjs`. Editors: video, photo, audio/podcast and writing (text). Studio saves the project; only Fresh Posts has a publish step so far. Live, spatial and interactive systems are blocked on infrastructure, devices or a sandboxed runtime.
