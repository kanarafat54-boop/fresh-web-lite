# Fresh Shorts — implementation inventory (P0 repository audit)

Baseline: `Fresh_Shorts_Master_Product_and_Engineering_Specification.docx` (Parts 1–18), reconciled with the current Fresh Flow repository. Fresh Studio is part of Fresh Flow and remains in scope wherever Shorts creation, editing, publishing, projects, or creator workflows depend on it.
Audited against `main` at `3e6100c` on 2026-11-04. Progress update on 2026-11-05 is in the section at the end.

## How to read the statuses

The specification defines Verified (implemented **and tested**), Partial, Planned and Blocked. This audit
was a code read: it did **not** run the app, the Shorts gate, or a browser. So nothing below is marked
Verified. "Partial" means code for the feature exists; the evidence column says where. Each Partial must be
verified end to end (UI → route → state → service → persistence → success and failure state) before it is
promoted. Nothing was changed, replaced or removed by this audit.

## Inventory

| Spec area | Status | Evidence in repo | Gap against the spec |
|---|---|---|---|
| Parent navigation (Home, Shorts, Video, Messages, Fresh Mail) | Partial | `src/app/components/BottomNav.tsx`, `FreshFlowHub.tsx` | Preserve as is. |
| Entry screen and discovery tabs (2.1) | Partial | `FreshFlowShortsStream.tsx` tabs: For You, Social, Trending, Fresh Picks, Learn, Relax | The Following tab is labelled "Social". Filter sheet (category, language, duration, date, creator, original or remix) not found. Routes are in-app state, not URLs: `/flow/shorts` is absent. |
| Immersive player (2.2) | Partial | `FreshFlowShortsStream.tsx` (1073 lines): single active video, sound memory, autoplay-blocked handling, action rail | No `/flow/shorts/watch/:shortId` route; playback speed, adaptive quality, caption and subtitle controls not confirmed. Deep links exist (`shortsLinks.ts`). |
| Image, audio and text Shorts (2.2) | Needs verification | `src/features/shorts/types/short.ts` | Confirm each media kind actually renders. |
| Following, Trending, Fresh Picks, Learn, Relax (2.3–2.7) | Partial | tab filters and ranking (`FreshFlowRanking`, `ForYouRanking.ts`, `PersonalRanking.ts`), `scripts/eval-fresh-shorts-ranking.mjs` | Dedicated screens not separate from the stream. |
| Search (2.8) | Partial | `ShortsExplore.tsx`, `shortsExplore.ts`, `ShortsTopicPage.tsx` | Voice and image search, suggestions, recent searches not confirmed. |
| Creator profile (2.9) | Partial | `ShortsCreatorProfile.tsx`; playlists in open PR #209 | Verify tabs and follow state. |
| Comments: text, audio, video, image, replies (Part 3) | Partial, strongest area | `src/features/comments/components/CommentPanel.tsx` (443 lines): MediaRecorder audio and video comments, file attachments to `comment-media`, `parent_id` replies, mute, report, block | Reply depth and per-format thread rendering, voice waveform, transcripts, edit, comment notifications to verify. Creator pinning exists in migration `20261102120000_fresh_short_collections_and_comment_pin.sql`; its UI is in open PR #209. |
| Comment reactions (3.8) | Partial | table `short_comment_reactions` (types: like, dislike, love, laugh, wow, sad, angry, fire, clap, support); the panel uses "like" only | Richer set (Curious, Inspire, Insightful, Agree, Helpful, Respect and similar) from `SHORTS_FINAL_SPEC.md` is not in the check constraint or the UI. |
| Short reactions, reposts, saves (Part 4) | Partial | `ShortsUniversalInteractionAdapter.ts`, `interactWithShort`, `removeShortInteraction`, universal interaction migrations | Repost list, quote repost and share-to-Messages not confirmed. |
| Share (4.3) | Partial | `ShortsSharePanel.tsx` | Verify targets. |
| Saved and collections (4.4, 11.1, 11.3) | Partial | collections migration `20261102120000`, `scripts/test-fresh-short-collections-rls.*`; playlist UI in PR #209 | No saved-library or collections screen on `main`. |
| Watch history (11.2) | Partial | `shortWatchSignals.ts`, `scripts/test-fresh-short-watch-signals.mjs` | Signals exist for ranking; no history screen found, and no clear-history control. |
| Personalization and recommendation controls (11.4) | Partial | `ShortsRecommendationControls.tsx`, `shortsPreferences.ts`, `scripts/test-fresh-shorts-prefs.mjs` | Verify "Why am I seeing this?" (not found by search). |
| Sound and audio ecosystem (Part 5) | Partial | `soundName` link opens a sound topic page (`shortsTopics.ts`) | No dedicated Sound page with usage count and "use this sound"; transcripts not found. |
| Related long videos and live highlights (6.4–6.6) | Partial | `FreshFlowLongVideos.tsx`, remix and duet columns in `20260824000000_shorts_interaction_depth.sql` | Link UI between a Short and its full video to verify. |
| Context panel, TrueMode, provenance, trust indicators (Part 7) | Mostly Planned | Only "Explain" and "Research" buttons that open Fresh AI (`FreshFlowShortsStream.tsx` ~L958) | No context panel, provenance or origin trace panel connected to real services. Spec rule 31: integrate only through services that exist. |
| Creator and publishing entry (Part 8) | Partial — integrated with Fresh Flow Creator Studio | `publishFreshShort.ts`, `ShortsCreateCamera.tsx`, `ShortsStudio.tsx`, `StudioProjects.tsx`, `freshFlowStudioIntegration.ts`, `fresh-studio/*` | Verify the complete handoff from each originating media system into the shared Studio, project persistence, editor capability status, resumable upload/processing, publish authorization, and return-to-origin context. Do not duplicate or exclude Studio. |
| Notifications (Part 9) | Partial | `ShortsNotifications.tsx`, `shortsActivity.ts` | Verify the notification types in 9.2. |
| Privacy, safety, moderation (Part 10) | Partial | `shortsSafety.ts` (report reasons, mute creator), comment report and block, moderation_state on comments | Visibility controls, appeals and the creator moderation queue not found. |
| System states (Part 12) | Partial | Empty feed text, `navigator.onLine` guard on pagination | No offline screen, permission-denied or unsupported-device states found. |
| Performance, Data Saver, accessibility, localization (Part 14) | Partial | `shortsPerformance.ts`, `public/shorts-performance.js`, `scripts/verify-fresh-flow-performance.mjs` | Data Saver mode and captions defaults not found. |
| Testing (Part 15) | Partial | Gate `.github/workflows/fresh-shorts-gate.yml` runs `test:shorts` (contract), performance, fabric, build; plus prefs, safety, topics, watch-signals, collections RLS and ranking scripts | No real-device Android test evidence. Run the gate and a browser pass to move items to Verified. |

## Open work that overlaps

- PR #209 (playlists, pinned comments, header polish): migrations committed but not applied to the live project; needs
  browser validation before merge. Treat it as the first step of P3 and P9 rather than redoing it.
- PR #162 (coordinated top and bottom navigation) touches the parent navigation that must be preserved.

## Proposed order (follows spec Part 16, smallest safe steps)

1. **P0 (this document)** — then run the Shorts gate and a browser pass to convert the Partial rows that already work into Verified.
2. **P1–P2** — real URL routes (`/flow/shorts`, `/flow/shorts/watch/:id`), Following label, filter sheet, playback speed and caption controls, offline, loading and unavailable states.
3. **P3–P5** — finish comments: richer comment reactions (additive constraint change), thread rendering for audio and video replies, comment notifications; Short reactions beyond like.
4. **P7, P9** — Sound page, saved library and collections screens (reuse #209).
5. **P10** — context panel wired only to services that exist today; the rest stays Planned.
6. **P11–P12** — moderation and privacy surfaces, Data Saver, accessibility, Android device pass.

## Constraints that hold throughout

- Preserve working playback, discovery, authentication and social infrastructure; extend, do not replace.
- Migrations are additive and are not applied by the engineer; owner applies after review.
- The API directory stays within the Vercel function limit (12 files); new endpoints reuse existing functions.
- Preserve the unified Fresh Flow Creator Studio. Shorts Studio is a domain workspace within that shared studio, not a competing destination. Keep all 24 Fresh Flow system profiles and their shared production-service mappings.

## Progress update (2026-11-05)

Merged since the audit (all CI-green; Partial until a phone-sized browser pass, which the Shorts browser test now covers at 320, 390 and 430px):

- **#219** SVG icon set for tabs, action rail, action menu and Fresh Flow bottom navigation; "Social" is now "Following".
- **#220** Routes `/flow/shorts` and `/flow/shorts/watch/:shortId` (old links keep working); designed loading, offline, failed, empty and unavailable states.
- **#221** Filter sheet (date, original or remixed, order, creator) and playback speed in the action menu.
- **#209** Playlists on the creator profile, pinned comments, compact two-row header with 36px tap targets.

Still open, and why:

| Item | Blocked by |
|---|---|
| Captions and subtitle controls | No caption track data exists in the schema yet; needs a captions source (upload or generation service). |
| Language and duration filters | Shorts carry no language or duration fields yet. |
| Richer comment reactions | Needs an additive migration to the reactions check constraint; owner applies it. |
| Use this sound | Needs the video worker connection. |
| Context panel, TrueMode, provenance (Part 7) | No service to read from; spec rule 31 forbids a fake panel. |
| Data Saver, Android device pass | Needs a defined data-saving policy and a real device run. |

Migrations from #209 (`20261102120000`, `20261102140000`) are in the repo but not applied to the live database.


## Progress update (2026-11-06 — repository re-audit)

Current audited `main`: `c9f96f34d50f65c899adc937a1210f6fe73c26d2` (2026-11-06 06:54 UTC).
The original P0 inventory above is historical; the following records the changes and current CI evidence observed on 2026-11-06.

Merged into `main` since the original inventory:
- **#209** — creator playlists and pinned comments, with additive migrations `20261102120000_fresh_short_collections_and_comment_pin.sql` and `20261102140000_harden_fresh_short_comment_pinning.sql`. The PR is merged. Its database changes are not assumed to be applied to production.
- **#219** — SVG icon family and Following label.
- **#220** — `/flow/shorts` and `/flow/shorts/watch/:shortId` routes, backward-compatible links, and designed loading/offline/error/empty/unavailable states.
- **#221** — date/original-or-remix/order/creator filters and playback-speed entry.
- **#222** — progress inventory documentation.

Open Fresh Shorts pull requests observed:
| PR | Scope | Observed CI / preview | Remaining gate |
|---|---|---|---|
| #224 | Richer comment reactions | Shorts gate and PostgreSQL integration passed; preview ready; one duplicate build job was cancelled | Additive migration `20261105100000_widen_short_comment_reactions.sql` is not in `main`; review and owner application required |
| #226 | Creator-uploaded VTT/SRT captions and player control | Shorts gate, build, navigation and related checks passed; Netlify and Vercel previews ready | Manual browser/phone review; automatic speech-to-text is not implemented |
| #227 | Context and sources panel | Shorts gate, backend contract, real PostgreSQL persistence, research-to-truth, Fresh AI integrity/training, Long Video analytics, build and smoke checks passed on `2e15a04`; Vercel and Netlify previews reported ready. A panel-specific Chromium browser interaction test was added on `d76f441`; its new CI run is pending. | Supabase Preview is skipped for this PR; main's migration-history drift remains. Panel-specific browser test, live signed-in API validation and physical Android validation remain before merge. |
| #228 | Duration/language filters and working remix/duet filter | Shorts gate, typecheck/build, migration replay, navigation and backend checks passed; previews ready | Additive migration `20261106100000_fresh_shorts_duration_language.sql` is not in `main`; review and owner application required. Language records the creator device language, not detected speech language |

Current-main validation evidence:
- On the audited main commit, deployment status contexts and core build, Fresh Shorts and PostgreSQL checks reported success. The Supabase Preview check failed as described below.
- The Supabase Preview check is **failing** with: `Remote migration versions not found in local migrations directory.` This is migration-history drift and must be reconciled before relying on Supabase branch previews.
- Successful PR previews are not production releases. No production database migration is considered applied based only on repository presence or CI replay.
- No physical Android device test is evidenced by this audit. The browser tests at narrow viewport widths are useful regression evidence, not a substitute for an actual Android device pass.

Re-audit conclusion:
- The strongest existing implementation remains the integrated Shorts pager and shared comment system, including text/audio/video/image attachments and parent-child replies. Treat these as **Partial** until the complete UI-to-persistence flows and failure handling are verified on a live signed-in session.
- Do not rebuild the pager, comment engine, playlists, pinned comments, routes, or filters already merged or in review.
- PR #227's optional `authorVerified` boundary was fixed in `21a802c`; its same-host test fixture was corrected in `2e15a04`. A panel-specific Chromium interaction test was added in `d76f441` and awaits fresh CI. Do not merge until that test and required checks pass; live signed-in API and Android-device validation remain manual gates. Review #224, #226 and #228 against current `main` and their migrations. Keep Supabase migration-history drift as a separate release gate.
- [Historical boundary, superseded by the 2026-11-23 preservation update below] This earlier audit treated Fresh Studio as outside the Shorts specification. The current product boundary is the unified Fresh Flow Creator Studio, which remains part of Fresh Flow and must be preserved and integrated.

## Progress update (2026-11-07 — slices merged)

Merged into `main` since the 2026-11-06 re-audit, each with CI green at merge time:
- **#223** — data saver (Auto / On / Off): fewer prefetched Shorts and lighter preloading when active. Auto follows the browser's data-saver and slow-network signals.
- **#224** — richer comment reactions (15 types, one per person per comment, counts and breakdown).
- **#226** — creator-uploaded VTT/SRT captions and the viewer caption control. Only existing captions are shown; nothing is generated.
- **#227** — Context and sources panel. Runs only when the viewer asks, sends the caption to Fresh AI, shows only http(s) links, and states that it is an automated check, not a human fact-check. A browser test bug (headings are uppercased by CSS) was fixed before merge.
- **#228** — duration and language recorded at publish; Length and Language filters shown only when loaded Shorts carry the data; the Remixes filter now matches (the loader previously never read the remix and duet links).

Migrations in the repository that the owner has **not** applied to the live database (repository presence is not evidence of application):
| Migration | Effect if not applied |
|---|---|
| `20261105100000_widen_short_comment_reactions.sql` | The 8 newer reaction types cannot be saved; the original reactions still work |
| `20261106100000_fresh_shorts_duration_language.sql` | Nothing breaks; Length and Language filters stay hidden and publishing skips the new fields |
| `20261102120000`, `20261102140000` (#209) | Playlists and pinned comments are not available live |

Known limits, stated plainly:
- Shorts published before #228 have no duration or language and never match those filters. There is no backfill.
- Language is the creator's device language, not detected from speech.
- Automatic captions need a speech-to-text service and an owner decision on sending audio to it. Not built.
- TrueMode origin and provenance tracing needs a provenance service. Not built; the Context panel does not claim it.
- "Use this sound" is not built. It needs an owner decision on whether creators allow others to reuse their audio, storage for attribution and permission, and mixing tested on real devices.
- No physical Android device pass is evidenced. Supabase migration-history drift remains a separate release gate.

## Progress update (2026-11-13 — items 1–8 and the previously blocked five)

Supersedes the "not applied" table above: the owner approved applying additive migrations to the live database, and the migrations through `20261112110000_fresh_sound_reuse.sql` were applied and checked. Repository presence is still not evidence of application; the moderation migration below is **not** applied yet.

| Item | State | Where |
|---|---|---|
| Privacy settings (10.5), comment controls, Quiet Mode, Restrict, block coverage for likes, messages and search | Merged (#270) and live | `shortsPrivacy.ts`, `shortsPrivacyService.ts`, privacy migration |
| Real Shorts addresses | Merged (#276) | `/flow/shorts` and `/flow/shorts/watch/:id`; the address follows the playing Short |
| Sound page and "Use this sound" | Merged (#275) and live | `sound_source_short_id`, `guard_short_sound_reuse` (honours the creator's reuse setting and blocks) |
| Reviewer queue, appeals, creator moderation notices | In PR #277, migration not applied | `20261112120000_fresh_shorts_moderation_review.sql`; reviewer = `users.role = 'admin'` |
| Origin declaration (TrueMode, creator-declared) | In PR #277 | Proof records of kind "provenance"; only the author's records count |
| Typed captions with timing | In PR #277 | `cuesFromTranscript`, `shiftCues`, "Write captions" |
| Device notifications while Fresh is open | In PR #277 | Opt-in, honours category switches and Quiet Mode |

Limits, stated plainly:
- Origin is what the creator declares. Fresh does not verify it and the panel says so.
- Typed captions are timing estimates from text the creator wrote, not speech recognition. Automatic captions from audio are still not built; they need a speech-to-text engine and an owner decision about sending audio to it.
- Device notifications use the browser Notification API and only appear while Fresh is open. Real push with the app closed needs Web Push keys and a server sender; not built.
- Mixing a reused sound in the camera has not been tested on a physical phone. No Android device pass is evidenced.
- Only users with the admin role can review. Who else may review is an owner decision.


## Current preservation and grading update (2026-11-23)

This section supersedes outdated scope statements above while retaining the historical audit trail. It is a repository inspection, not a claim that all user journeys have passed live end-to-end testing.

### Preservation boundary — corrected

- Fresh Studio / Creator Studio is part of Fresh Flow. It is not excluded from the product or from the integration work.
- There is one shared Creator Studio shell with domain workspaces. Shorts Studio is a Shorts-specific workspace for drafts, publishing, analytics and creator management; it must not become a competing second studio.
- Fresh Flow's 24 independent media systems remain separate user-facing experiences and map into the shared Studio through `freshFlowStudioIntegration.ts`.
- Preserve the universal platform Home and its navigation separately from Fresh Flow's own Home and media-world navigation.
- Preserve existing Shorts routes, pager/player, comments and media attachments, reactions, creator profiles, sound reuse, context/provenance declarations, moderation/privacy, notifications, history/saved/collections, Data Saver, and all supporting migrations and verification scripts. Improve them additively; do not delete or silently simplify them.

### Repository evidence observed on 2026-11-23

| Area | Repository evidence | Grade from this inspection | Required proof before Verified |
|---|---|---|---|
| Fresh Flow shell and navigation | `FreshFlowHub.tsx`, `FreshFlowHome.tsx`, `freshFlowArchitecture.ts`, `freshFlowSystemRegistry.ts` | **B** — implemented in code; browser/device verification pending | Route transitions, deep links, back behavior, global Home separation, responsive navigation |
| Shorts discovery and playback | `FreshFlowShortsExperience.tsx`, `FreshFlowShortsStream.tsx`, `shorts/*`, `shortsPerformance.ts` | **B** — implemented in code; end-to-end verification pending | Real media, feed ordering, playback/retry/buffering, URL synchronization, accessibility and device pass |
| Search, topics, filters, recommendations | `ShortsExplore.tsx`, `ShortsTopicPage.tsx`, `shortsExplore.ts`, `shortsFilters.ts`, recommendation controls | **B** — implemented in code; data coverage and behavior need verification | Search source, filter combinations, empty/error states, recommendation controls |
| Comments and social interactions | Shared `CommentPanel.tsx`, comment reaction code, universal interaction adapter and migrations | **B** — implemented in code; persistence/security coverage must be rechecked | Text/audio/video/image comments, nested replies, all reaction types, repost/share/save, RLS and failure handling |
| Creator profiles and community | `ShortsCreatorProfile.tsx`, playlists, follow state and notifications | **B** — implemented in code; live user journey pending | Follow/unfollow persistence, profile tabs, playlists, notification delivery |
| Sounds and reuse | `shortsSound.ts`, `soundReuse.ts`, sound topic/reuse UI and migration | **B** — implemented in code; physical-device mixing verification pending | Permission checks, attribution, block/privacy enforcement, camera/editor handoff |
| Context, captions and provenance | Context/provenance panels, captions and supporting services | **B** — creator-declared provenance and uploaded/typed captions exist with explicit limits; **D** for independent origin verification and automatic speech transcription | Verify creator-declared vs independently verified origin labels, source links, caption timing and service failure |
| Safety, privacy and moderation | Privacy, reporting, moderation, appeals and user-block services/components | **B** — implemented in code; live policy and reviewer workflow pending verification | RLS/API authorization, appeals, admin-only review boundary, block/mute behavior, auditability |
| Saved, history and collections | Saved/history sheets, playlists/collections services and migrations | **B** — implemented in code; complete persistence path pending verification | Save/remove, collection CRUD, history clear, cross-device state and ownership tests |
| Notifications | `ShortsNotifications.tsx`, activity and notification state/delivery services | **B** — in-app and foreground notification foundations exist; **C** for true push delivery while the app is closed | In-app state, category preferences, quiet mode, foreground-only browser notifications vs true push |
| Create Studio integration | `FreshFlowHub.tsx` routes the Studio system through `FreshFlowSystemExperience.tsx` to `FreshStudioApp.tsx`; `FreshStudioApp.tsx` lazy-loads and renders `ShortsStudio.tsx` for its `shorts` section; `freshFlowStudioIntegration.ts`, `StudioProjects.tsx`, `ShortsCreateCamera.tsx`, `fresh-studio/*` | **B** — shared Studio architecture and Shorts-specific dashboard are integrated as a domain workspace; editor/provider maturity varies by capability | Verify every origin handoff, Shorts drafts/publishing/analytics parity, project persistence/versioning, editor capability, media pipeline, processing and authorized publishing |
| Reliability, performance and accessibility | Shorts state screens, Data Saver, telemetry, performance scripts and browser tests | **B** — automated coverage exists; physical Android review not evidenced here | Run all gates, keyboard/focus/contrast/reduced motion, 320–430px layouts, slow/offline/permission-denied states and real Android testing |

### Creator Studio integration contract

The repository's `verify-fresh-flow-studio-integration.mjs` asserts 24 registered Fresh Flow systems, 24 matching Studio profiles, valid media kinds/workspaces, explicit implementation statuses, creation intents, capability dependencies, shared services, and preservation of originating system metadata through project creation/loading and Studio launch. The active Fresh Flow Studio route loads `FreshStudioApp` through `FreshFlowSystemExperience`; `FreshStudioApp` also lazy-loads `ShortsStudio.tsx` for its `shorts` workspace section. The integration is therefore present in code, not an orphaned component. The remaining task is to verify that Shorts-specific overview, drafts, videos, analytics and creator controls remain coherent with the unified project, publishing, asset and media-processing flows. This is a static contract check; it does not prove every editor, provider, upload worker, or publishing destination is production-ready.

### Current repository / PR notes

- Main inspected at `fbd72a54cf4a29ec5682cf9691630cf639823c84`.
- PR #324 is open and concerns restoration of reaction read policies and owner-scoped post-reaction updates. Its description reports isolated migration replay and behavioral tests passed; it is not merged and must be reviewed independently.
- PR #325 is open/draft and concerns bounded News / Posts pagination. It is adjacent Fresh Flow work, not a reason to replace or bypass the shared pagination contract.
- Do not infer production database state from migration files or isolated replay. Confirm live migration status before claiming production behavior.
- No physical Android device validation is evidenced by this repository inspection.

### Grading rules for the next implementation pass

Use four explicit grades (no area is promoted to A based only on source-code presence):
- **A — Verified:** implementation plus automated and relevant end-to-end/browser/device tests, including persistence and failure paths.
- **B — Implemented, verification incomplete:** substantial code exists but one or more real user journeys or environments are not proven.
- **C — Partial:** only part of the specified behavior exists, or integration is incomplete.
- **D — Missing / blocked:** no safe implementation exists yet, or a required provider/owner decision is unavailable.

A grade is not a deletion decision. Every B/C/D item remains in the preservation ledger with its evidence, gap, dependency and next action. Do not downgrade a feature merely because its provider is not yet connected; record the capability boundary honestly and retain the existing foundation.


### Additive UI and creator-entry implementation pass (2026-11-23)

- Added `FreshFlowVisualRefresh.css` and imported it from the existing `FreshFlowHub.tsx`. The layer updates presentation only across the existing Flow shell, Home, Shorts feed/player, Explore, creator profile, notifications, capture flow and embedded Shorts Studio. Existing components remain the owners of behavior, data and persistence.
- Corrected the Shorts feed's signed-in create action: it previously navigated to the generic `creator` route; it now opens `fresh-flow-system-fresh-studio`, preserving the create intent so the shared `FreshStudioApp` can resume in its publishing workflow.
- Extended `verify-fresh-flow-studio-integration.mjs` with a regression assertion for the Shorts-to-shared-Studio route and create-intent handoff.
- Latest implementation commit at time of this note: `ff54f27da745140ed224f5a35d5a6d3a5c6d49ea`.
- Fresh Shorts Production Gate, Fresh Web Lite build gate and Fresh Flow Navigation Browser Test were triggered for this commit; their final conclusions must be read before promoting any related grade to A.
- The visual refresh is not a substitute for real-device visual review. Verify 320/360/390/430px layouts, keyboard/focus, reduced motion, comment/media attachment flows, camera permissions, offline/retry states and actual Studio publishing on signed-in Android.


## Master specification milestone grades (2026-11-24)

The following grades apply to the 12 milestones in Part 16 of the master specification. They are repository-inspection grades, not production certification. No milestone receives A until its relevant end-to-end and failure-path evidence is recorded.

| Spec milestone | Grade | Existing foundation to preserve | Remaining work / proof |
|---|---|---|---|
| P0 — Repository audit and preservation | **B** | Existing feature inventory, architecture maps, migrations, test gates, Studio integration registry and this reconciliation addendum | Complete the requirement-by-requirement trace against every route, service, schema, storage policy, open PR and production migration state |
| P1 — Shorts navigation and feed | **B** | Fresh Flow navigation, Shorts experience, discovery tabs, explore/topic surfaces, feed services and deep links | Browser/device validation of all feed tabs, ranking controls, navigation/back behavior, pagination, duplicates, offline recovery and empty/error states |
| P2 — Player and playback reliability | **B** | Vertical stream/player, playback telemetry, captions, quality controls, Data Saver and performance services | Validate image/audio/text media modes, adaptive quality, memory/decoder cleanup, buffering, background/resume, accessibility alternatives and low-memory Android |
| P3 — Text comments and replies | **B** | Shared CommentPanel, thread/reply services, comment sorting, pinned/highlighted controls and persistence migrations | Verify server-confirmed writes, pagination, edit/delete ownership, nested threads, duplicate prevention, failure reconciliation and notification links |
| P4 — Audio and video comments | **B** | Audio/video/image attachment composer and playback foundations, media upload/processing contracts, mixed-media comment/reply paths | Verify microphone/camera/gallery permission handling, recording lifecycle, attachment processing, mixed-media retry, playback ducking and end-to-end thread persistence |
| P5 — Reactions and social interactions | **B** | Short/comment/reply reaction model, reaction selector, repost/share/save/follow services and universal interaction integration | Validate every specified reaction type, selected-state reconciliation, concurrent counts, repost attribution, share privacy and cross-surface relationship consistency |
| P6 — Creator profiles and following | **B** | ShortsCreatorProfile, playlists, follow state, creator actions and activity notifications | Verify privacy rules, profile tabs, mute/block/restrict/report, follow persistence and creator notification preferences |
| P7 — Sound and audio discovery | **B** | Sound pages/topics, attribution, sound reuse, recording handoff and media playback foundations | Verify rights/permission enforcement, use counts, attribution lineage, audio-only Short behavior, overlap prevention and device audio behavior |
| P8 — Search, trending and personalization | **B** | ShortsExplore, topic pages, filters, trending/following surfaces and preference controls | Prove ranking inputs and preference effects with real service data; validate search history, safe search, category filters, regional/global controls and reset |
| P9 — Sharing, reposts and collections | **B** | Share/deep-link services, repost relationships, saved/history sheets, playlists and collection persistence foundations | Verify Android share sheet and Fresh destinations, private-link authorization, collection CRUD, history pause/clear, cross-device sync and attribution |
| P10 — Context, provenance and TrueMode | **C** | Context panel, creator/source declarations, remix lineage and existing Fresh AI / TrueMode integration points | Distinguish creator-declared context from independently verified evidence; verify provenance links, AI-generated/remixed disclosures, recommendation explanations and unavailable-service behavior |
| P11 — Moderation, privacy and notifications | **B** | Reporting, blocking/muting, moderation state, privacy controls, appeals foundations, in-app notifications and category preferences | Verify server-side/API/media authorization, reviewer boundaries, appeals workflow, quiet mode and actual push delivery while app is closed |
| P12 — Performance, accessibility and full verification | **B** | Data Saver, lazy loading, telemetry, loading/error/empty handling, accessibility attributes, responsive CSS and CI gates | Complete WCAG review, reduced-motion/focus/contrast/text-scale checks, 320–430px browser coverage, offline/permission/unsupported-device paths and physical Android testing |

### Cross-cutting Fresh Studio integration grade

**B — Integrated in code; end-to-end verification incomplete.** Fresh Studio remains the shared Fresh Flow Creator Studio. The 24-system registry/profile contract and project-origin metadata path are preserved. The Shorts create intent now passes the `fresh-shorts` source-system ID plus source Short, creator ID, media URL, caption and action metadata into the shared Studio route. Required proof: browser journey through draft, upload/processing, publish confirmation, remix/duet attribution, return-to-feed behavior, and server-side authorization.

### Grade discipline

- **A / Verified:** only after UI, route, state, backend, authorization, persistence, success, failure and relevant device checks pass.
- **B / Implemented:** existing code is present but proof remains.
- **C / Partial:** an explicit subset of the requirement remains incomplete.
- **D / Missing or blocked:** no safe implementation or an unavailable prerequisite. Keep it in the ledger with a next action.
- These grades never remove scope. All D items remain required unless the product owner explicitly changes the requirement.


## Full feature-accessibility and live-contract audit (2026-11-24)

This update supplements the 2026-11-23 preservation grade. It records an inspection of the current PR #326 branch and the connected Fresh Web Lite Supabase project. It does not promote unverified features to A and does not change product scope.

### Authoritative material checked

- Read all 17 pages of `Fresh_Shorts_Master_Product_and_Engineering_Specification.docx`.
- Read `docs/FRESH_SHORTS_MASTER_SPEC_SCOPE_RECONCILIATION_2026-11-24.md`. It supersedes only the historic Fresh Studio exclusion; all other requirements remain.
- The named `Fresh_Shorts_Master_Specification_Reconciled_2026-11-24.docx` was not present in the accessible Library listing or at the checked repository root/docs paths. Do not claim that this DOCX was read. The repository Markdown addendum is the reconciled scope authority available in this branch.
- Read this implementation inventory and inspected PR #326, its branch, diff, reviews, source files and workflow jobs.
- PR #326 remains open and unmerged. The latest branch head at the time of this audit update was `c65dab9d6bc220a23965be69cd4740c5285006c4`. No review submissions or inline review threads were returned during the initial review check.

### Feature entry-point and discoverability map

| Feature / requirement | Current entry point and access path | Accessibility / preservation finding | Grade |
|---|---|---|---|
| Fresh Flow Home | Bottom navigation → Home; Home hero → Create; “Explore all 24 systems” expands the directory | All 24 registry systems remain reachable through the directory. Home labels several recommendation cards as examples rather than live content. Mobile Home reserves bottom space for navigation. | B |
| Fresh Flow media worlds | Fresh Flow header top navigation; Flow Switch; system directory | Shorts header exposes Live, VR/AR, Podcasts, Music and Others. Flow Switch and Home directory retain the wider system registry. | B |
| Search | Search icon in the Fresh Flow header; Shorts scope opens Shorts Explore | Search tabs are Videos, Posts, News, Web Info, People, Sounds and Topics. The Sounds tab (added in `7bc91e3`) lists real `sound_name` values with use counts and opens the existing sound page; blocked and hidden creators are filtered. Covered by `test:fresh-search-sounds` (source contract plus the real grouping function). Not yet browser-verified, and there is no voice or image search. | B |
| Notifications | Shorts header More menu → Notifications | In-app activity, category tabs, read/clear controls, preferences and appeals have entry points. Live comment triggers enqueue new comments, replies and mentions; the live `short_comment_reactions` table has no notification trigger and the comment reaction handlers do not enqueue a reaction event. Foreground browser/device notification support is not proof of background push delivery. | C |
| Create / Camera | Shorts header More menu → Add/Create or Camera; player secondary creation actions; Home Create → shared Studio | Create intents retain source Short, creator, media URL, caption and action metadata where supplied. Verify actual capture, upload, editing and publish journeys. | B |
| Shorts discovery | Shorts stream discovery tabs and Filters sheet | Current stream exposes For You, Following, Friends, Trending, Fresh Picks, Learn and Relax, with a separate filter sheet. | B |
| Shorts playback | Stream media surface; tap play/pause, double-tap like, long-press playback options; progress control | Full media remains primary. Creator, reaction, comment, share, save, repost and More controls are on the action rail; additional controls remain in contextual surfaces. | B |
| Secondary player actions | Player More menu and Fresh AI/context surfaces | Includes gifts, Fresh AI, sound, playback speed, captions, Data Saver, context/source, recommendation controls, comment audience controls, remix/duet/quote/edit/collaboration intents, mute/block/report and related actions. Some capabilities are intentionally contextual rather than permanently displayed. | B |
| Saved Shorts and watch history | Player More menu → Saved Shorts / History | Both sheets have a discoverable entry in the secondary action menu; preserve these paths and verify account persistence and cross-device behavior. | B |
| Creator profile | Tap creator identity/avatar on a Short or People search result | Current tabs are Shorts, Playlists and About. The master requires profile statistics, a Short library, followers/following, public collections, sound attribution and verification where applicable. Stats and Shorts/Playlists/About are present; public collection presentation and the full followers/following journey still need verification. Videos/share-profile/creator-notification controls are possible extensions, not asserted here as explicit master requirements. A Reposts tab was added as an additive extension (`creatorReposts.ts`, `test:fresh-creator-reposts`): it lists real `short_reposts` rows, hides blocked/hidden original authors and shows loading, error and empty states; it is not browser-verified. Profile sharing is not built because no creator route or address exists to share; add the route first. | C |
| Comment panel | Player comment action rail | The panel now has modal semantics, focus containment/restoration, Escape close, visual-viewport keyboard resizing, avatar-led expandable textarea, separate image/gallery/file/recording tools, Relevant default sorting, media/creator/question filters, creator/verified badges, reply counts, reaction breakdown, copy/share and session-level Not interested. Reply opens a focused thread view and restores the previous all-comments scroll position. | B |
| Comment editing | No current edit entry in the author's comment menu | Live `short_comments` has no UPDATE RLS policy and no `updated_at` column. Editing is blocked until a least-privilege additive database contract and UI journey are designed and verified. | D |
| Comment threads | Inline nested `parent_id` replies; Reply opens a focused thread view | Recursive tree rendering and a dedicated focused thread view now exist. The all-comments scroll position is saved/restored. Pagination and large-thread behavior remain unverified. | B |
| Comment media | Avatar-led composer with separate image, gallery, audio, video and general-file controls; audio/video recording; inline playback | Frontend validator caps six files and applies client-side MIME/size checks. Upload failure and comment deletion now attempt owned-media cleanup. Current display is basic inline media; image viewer, gallery reorder/preview, waveform, duration/speed controls, transcript, pause/resume recording and video camera switching remain incomplete. | B |
| Comment moderation | Per-comment More menu; creator pin and held-comment review | Reporting, restriction, pinning, real account blocking, separate muting, copy/share and session-level Not interested are available. The Not interested dismissal is session-only. Creator highlight, hide, restrict-replies and full moderation controls still need coverage. | B |
| Fresh Studio | Fresh Flow bottom navigation; Home Create; Shorts Create/Camera and contextual creation actions | One shared `FreshStudioApp` is used. Studio sections include Dashboard, Shorts, Content, Create, Device tools, Publish, Analytics, Audio, Design, Distribute, Earn and Settings; mobile exposes primary sections and a drawer. Shorts Studio remains a domain workspace inside it. | B |
| 24 system-to-Studio profiles | Fresh Flow registry and `freshFlowStudioIntegration.ts` | 24 registered systems and 24 matching Studio profiles are asserted by the integration contract. This is an architectural/static contract, not proof that every provider/editor/publishing destination is live. | B |
| Context, provenance and TrueMode | Player More → Context and sources; creator declarations and remix lineage | Preserve existing context and source surfaces. Creator-declared origin must remain distinct from independently verified evidence. | C |
| Navigation obstruction | Fixed six-destination parent bar; comment modal overlay; Shorts player overlay CSS | The player caption/action overlays now reserve bottom-navigation clearance. Comments remain above the bar at z-index 10000. Home and embedded Studio also reserve bottom space. Device/keyboard verification remains outstanding. | B |

### Live database and storage evidence

The connected project `Fresh Web Lite` (`fwbbyowalnfckpmbutcz`) was active and healthy when inspected. Read-only SQL was used; no production schema, policy, bucket or data was changed.

| Live object | Observed contract | Product implication |
|---|---|---|
| `public.short_comments` | RLS enabled. SELECT policy hides pending comments except from the author and the Short's creator. INSERT checks `auth.uid() = author_id`; DELETE checks the same ownership. No UPDATE policy exists. BEFORE INSERT triggers enforce blocks, comment audience, restriction/keyword holds; AFTER INSERT triggers enqueue comment/reply/mention notifications and maintain comment counts. | Text/media insert, read and owner-delete paths have database policies. Edit cannot work yet. Server-side audience and notification enforcement exists. |
| `public.short_comments.content` | NOT NULL. `attachments` is also NOT NULL. No `updated_at` column was present. | The composer previously sent NULL for media-only comments, conflicting with the live schema. The payload now sends an empty string for an attachment-only comment. Edit timestamps/history need an additive schema plan. |
| `public.short_comment_reactions` | SELECT policy is `true`; INSERT/DELETE/UPDATE are scoped to the current user. | Reaction persistence has owner checks. Public reactor visibility should be reviewed against the spec's “where privacy permits” requirement. |
| `public.user_blocks` | SELECT/INSERT/DELETE are scoped to `blocker_id = auth.uid()`. An AFTER INSERT trigger removes follows in both directions between the blocker and blocked account. | The existing block service is suitable for the comment action; the UI had incorrectly called the mute service and is now corrected. |
| `public.fresh_user_preferences` | Owner-scoped policy for all operations. | The separate mute preference path remains distinct from account blocking. |
| Storage bucket `comment-media` | Bucket is public; no bucket file-size limit or MIME allowlist is configured. Object INSERT is restricted to the authenticated user's folder; owner UPDATE/DELETE policies exist; public read is allowed. | Client-side limits are not server-side limits. Public URLs may not be appropriate for private/restricted media. Review visibility, MIME/size enforcement and retention before changing bucket behavior. |
| Live migration history | The live migration ledger includes `fresh_short_collections_and_comment_pin`, hardened comment pinning, widened comment reactions, Shorts reporting, user blocks, privacy controls, moderation review and push-subscription migrations. | These specific migration versions are applied to the connected project; this does not prove every end-to-end user journey or every storage behavior. |\n| Security Advisor | Warnings include 30 RLS-enabled tables without policies, 4 anon-callable and 16 authenticated-callable SECURITY DEFINER functions. The comment-specific pin/review/comment-mode functions inspected include `auth.uid()` and creator-ownership checks; `short_sound_reuse_allowed` returns a creator preference and is callable by anon. | Review each function's purpose, auth check, search_path and least-privilege EXECUTE grants. Do not treat the warning as proof of an exploit, but do not ignore it. The 30 no-policy findings include unrelated Fresh AI, machine, mail and private analytics tables and need a separate owner/security review. |

### Additive changes made on PR #326

The following are implementation changes, not claims of completed product verification:

- `8d4fc826` — introduced dialog semantics, focus containment, Escape close and focus restoration; began the two-row comment composer.
- `21f8b188` — added compact, touch-sized composer rows and visible keyboard focus styles.
- `a375d6d2` — reserved space above the persistent bottom navigation for the Shorts caption and action rail.
- `069da58a` and `8f9a5c4c` — aligned the visual-refresh and embedded Shorts Studio accent colors with the master violet/indigo identity.
- `1ee87a75` — stabilized focus management so changing parent callbacks do not repeatedly steal focus.
- `76ca82f0` — removed duplicated safe-area padding from the comment text row.
- `f525258e` — separated actual account blocking from muting in the comment menu.
- `3a5530a4` — changed attachment-only comment payloads to send an empty string instead of NULL, matching the live non-null content column.
- `b7be687b` / `4aae7845` — added privacy-filtered profile avatars and verified/creator badges to comment cards.
- `8161b605` / `3bf7e191` — exposed reply counts and a keyboard-accessible reaction breakdown.
- `6055ec10` / `94f17a96` — added copy/share and session-level Not interested comment actions with truthful clipboard fallback messaging.
- `594e685e` / `6c78da2c` / `5f855b73` — added focused thread navigation, reply counts, and restoration of the all-comments scroll position.
- `57ffdc2e` / `cab6ddbe` — added focus containment, Escape handling and focus restoration to Fresh Search, including nested sound-page close behavior.
- `01b89137`, `12909484`, `c65dab9d` — added a regression contract script, package command and Fresh Shorts gate step for modal semantics, keyboard behavior, media-only submission, block/mute separation and navigation clearance.

### Verification status and limits

- The earlier PR #326 head `d15896ff8988d9fafe881576186aad4cf2c52ede` had successful Fresh Shorts, build and navigation workflow runs. Its navigation workflow used a Playwright browser for Shorts pager and guest comment-sheet open/close checks at 320/390/430px, plus a separate layout contract at 320/360/390/430px; it did not establish a signed-in comment submission or soft-keyboard journey.
- The new comment accessibility/preservation source regression assertions were executed against the fetched branch files during this audit: **35/35 fetched-source checks passed**. Search Sounds and search-dialog keyboard contracts are also in the Fresh Shorts gate. These are source-contract checks, not substitutes for browser interaction tests.
- Latest PR #326 branch head at this inventory update: `002ee8298d201dc5675cc1981a1493314fef4423`; PR remains open and mergeable, 95 commits ahead of `main` and 0 behind. Fresh Shorts Production Gate #3088 and Fresh Web Lite build gate #2273 are queued. Fresh Flow Navigation Browser Test #460 was cancelled once by workflow concurrency and its navigation job was re-queued. Netlify deploy preview #326 is successful; Vercel preview is pending. Earlier run `Fresh Shorts Production Gate #3031` passed the then-current gate, including the first version of the comment contract; the latest expanded comment/search/Playwright changes still require their own completed run.
- The Playwright pager test now runs at 320/360/390/430px and checks the comment sheet's geometry, modal semantics, z-index above bottom navigation, independent list scrolling, focus entry, Tab containment, Escape close, focus restoration, close-button behavior, Relevant default sorting and interactive comment filters. It uses a guest session, so it does not verify signed-in comment submission, reactions, uploads, or backend persistence. The visual-viewport keyboard resize path is source-tested but not exercised with a real mobile soft keyboard.
- No physical Android device was available for this audit. Do not claim Android keyboard, camera, microphone, safe-area or low-memory verification. No local checkout was mounted, so local-only uncommitted changes cannot be ruled out.
- No production Supabase migration, bucket setting or policy was changed.
- The reconciled DOCX named in the brief was not located; the Markdown scope addendum was read and is preserved.

### Remaining priority work

1. **P0 — Finish traceability:** reconcile every remaining master requirement against its actual route, service, table, policy, storage bucket, test and production migration state.
2. **P1 — Verify the navigation fix:** browser-test player rail/caption positions with the six-item bottom bar at 320/360/390/430px and verify scrolling/keyboard behavior.
3. **P2 — Complete comments safely:** design a least-privilege author edit policy and timestamp/history contract; add pagination, media filters, reply counts, creator highlights, richer media previews and proper attachment cleanup; test the entire signed-in journey.
4. **P3 — Harden comment media:** set server-side size/MIME constraints and determine whether private/restricted comment attachments need authenticated delivery. Do not break playback for public Shorts.
5. **P4 — Restore missing discoverability and profile scope:** add the Sounds search category and account for creator Videos, Reposts, Collections, profile sharing and notification preferences without deleting existing tabs.
6. **P5 — Complete Studio verification:** test Shorts record/import → project → editor → upload/processing → publish → return-to-origin, including source metadata and authorization.
7. **P6 — Device and release proof:** run browser interaction tests, low-memory Android tests, keyboard/safe-area/permission/offline cases, then verify preview and production independently.

All C/D gaps remain in scope. None is permission to remove a feature.


## Progress update (2026-11-24 — reference-direction implementation pass)

**Branch:** `audit/fresh-shorts-preservation-grade-20261123`  
**PR:** #326  
**Implementation commits:** `12addbe4f87137f52c6c6d3ecc6808e725b8f519` (additive reference-direction stylesheet), `95d5b839c91cf0ad19f57910efe56ef1cdb6d0d7` (load stylesheet in Fresh Flow hub), `0449381ca45b845c2d0121955878f2004474e60e` (extend comment/navigation style contract checks), `83c423c2e5474cecb90e68504cd7d623cf0467e5` (correct scoped comments stacking assertion).

### Implemented in this pass

- Added `src/features/fresh-flow/components/FreshFlowReferenceDirection.css` as a final additive style layer loaded by `FreshFlowHub.tsx`.
- Established a scoped Fresh Flow visual token set: midnight canvas `#0D0D12`, raised surfaces `#12121A` / `#191925`, violet `#635BFF`, and Fresh green `#22E58A`.
- Applied the direction to the existing hub masthead, Home hero, recommendation/directory cards, Shorts discovery tabs and action rail, comments sheet, and six-destination Fresh Flow bottom navigation.
- Increased comments foreground stacking above the persistent bottom navigation, styled the panel as an independently scrollable foreground task, and added bottom safe-area padding to the composer.
- Kept all existing routes, navigation destinations, feature components, data contracts and Studio handoff code unchanged.
- Extended `scripts/test-fresh-shorts-comment-accessibility.mjs` with source-contract assertions for stylesheet loading, design tokens, player action rail, comment z-index, safe-area handling and reduced-motion support.

### Evidence limits / remaining work

- This pass is a CSS and source-contract implementation; it is **not** proof of a successful browser/device experience. The new checks still need to run in CI and the preview.
- No actual screenshot comparison or Android soft-keyboard/device test was available during this pass.
- The original 17-page master DOCX was recovered from the user's Library and read in full during this pass. It contains the historical Fresh Studio exclusion in Parts 1, 8, 17 and the final scope confirmation; the checked-in 2026-11-24 scope addendum explicitly supersedes only those exclusions and makes the shared Studio in-scope. The separately named reconciled DOCX was not found in the Library search or at the repository root. The source DOCX remains unchanged as an auditable historical baseline.
- No database migration was applied, no production setting changed, and no PR merge was performed.

### Next implementation sequence

1. Run the Shorts gate, comment accessibility test, TypeScript/lint/build and navigation browser workflow against the new head; fix any failures.
2. Inspect rendered preview at 320/360/390/430px and desktop; verify the six-item bottom navigation and comments sheet with actual viewport/keyboard behavior.
3. Continue feature-entry-point audit for Home, Explore/search, creator profile, sounds, saved/collections, notifications, context/provenance, and Studio; map each to existing routes/services before changing interaction structure.
4. Keep all unverified features at B/C/D until real journeys, authorization and persistence are evidenced.


**Latest reference-direction head:** `83c423c2e5474cecb90e68504cd7d623cf0467e5`. PR #326 remains open and mergeable. Vercel and Netlify preview statuses are pending at the latest check; no completed GitHub Actions run was returned for this exact head during the check. Do not mark the new visual layer as browser-verified until those checks complete.


## Fresh Flow & Fresh Shorts feature-accessibility audit (2026-11-24 — live PR #326 recheck)

**Audit source ref:** `12cce069e8a753890322ce1e29eb07b904fecfc5`  
**PR:** [#326](https://github.com/kanarafat54-boop/fresh-web-lite/pull/326)  
**Scope:** Existing Fresh Flow Home, media worlds, Shorts, comments/social, creator surfaces, search/sounds, context/safety, navigation and the shared Creator Studio. This is a repository and live-CI audit, not a claim of physical-device or signed-in production verification.

### Product boundary and preservation confirmation

- Fresh Studio / Create Studio remains part of Fresh Flow. The application routes all system creation through the shared `FreshStudioApp`; `ShortsStudio` is a Shorts domain workspace, not a competing editor.
- `freshFlowStudioIntegration.ts` declares 24 system profiles; `verify-fresh-flow-studio-integration.mjs` checks 24 registry systems, 24 unique matching profiles, capability dependencies and Shorts-origin context handoff.
- Shorts create intents identify `fresh-shorts` and retain source creator, media URL, caption and action intent where supplied. The static contract does not prove every capture/editor/provider/publishing path is live.
- The universal platform Home remains distinct from Fresh Flow Home. Existing routes, backend contracts and user data are preservation boundaries.
- The original master DOCX remains an unchanged historical reference. The checked-in Markdown scope addendum supersedes only the old Fresh Studio exclusions. The separately named reconciled DOCX was not found in the accessible Library listing or checked repository paths; it is not claimed as read.

### Feature accessibility and implementation grades

| Product area | Existing entry point / implementation evidence | Access, backend and verification findings | Grade |
|---|---|---|---|
| Fresh Flow Home | Parent bottom navigation → Home; `FreshFlowHome`; Home hero, Create and expandable 24-system directory | Distinct from universal Home. Existing system directory and real entry points are retained. Recommendation examples must not be mistaken for live personalized inventory. Responsive browser test covers the shell; personalization journeys remain unverified. | B |
| Media worlds / discovery | `FreshFlowHub.tsx`; top media navigation, Flow Switch and Home directory | Eight top destinations remain: Discover, Videos, News / Posts, Live, VR / AR, Podcasts, Music and Others. All 24 system profiles remain in the registry. Top navigation is horizontally scrollable on narrow screens. | B |
| Parent navigation | `BottomNav.tsx`, `BottomNav.css`, Fresh Flow shell | Six destinations remain: Home, Shorts, Creator Studio, Video, Messages and Fresh Mail. The navigation is not replaced by a Shorts-only bar. Browser layout tests enforce six 44px targets. | B |
| Shorts discovery | `FreshFlowShortsStream.tsx`, discovery tabs and filter surfaces | For You, Following, Friends, Trending, Fresh Picks, Learn and Relax are present; filtering is contextual rather than permanently crowding the player. Real feed ordering, pagination, personalization and error recovery require signed-in/live data verification. | B |
| Shorts player / playback | `FreshFlowShortsExperience.tsx`, `FreshFlowShortsStream.tsx`, player action rail and contextual menu | Media-first layout with creator, reaction, comments, repost/share/save and More actions; secondary tools include playback speed, captions, Data Saver and creation/context actions. Browser and real-media playback recovery, adaptive quality, caption track availability and device memory remain unverified. | B |
| Comments and composer | `CommentPanel.tsx`, `CommentPanel.css`; player comment action | Text, audio/video recording, image/gallery/file attachments, mixed-media payloads, sorting, filters, reaction breakdown, author actions, report/block/mute and creator controls have implementation paths. Composer is separated from independently scrolling comments and accounts for visual viewport/keyboard changes. | B |
| Replies and nested threads | Shared comments component; `parent_id` thread model; focused thread view | Root resolution, nested rendering, reply counts and restoration of the previous comments scroll position exist. Pagination, large-thread behavior and signed-in multi-format reply journeys remain unverified. | B |
| Comment edit | Author comment menu / database contract | No live `short_comments` UPDATE RLS policy or `updated_at` field was observed in the prior live schema inspection. Do not expose a nonfunctional edit action; design a least-privilege additive policy/history contract first. | D |
| Comment reactions | `commentReactions.ts`, shared reaction model and database reaction rows | Reaction summary and selected reaction behavior are implemented. Confirm the live allowed reaction set and all 17 master-spec values, persistence, counts and privacy of reactor lists before A. | B |
| Repost / share / save | Player action rail, share panel, universal interaction adapter and creator repost service | Existing interaction paths are preserved. Creator Reposts tab now reads real `short_reposts` rows and filters blocked/hidden original authors; search and creator repost source-contract tests exist. Cross-surface share targets, quote repost, save collections and browser journeys remain to verify. | B |
| Search | Fresh Flow search icon → `FreshFlowSearchSurface`; `searchService.ts` | Real full-text RPCs with fallback, people, posts, videos, topics and Web Info paths. Sounds category groups stored `sound_name` values (up to 200 loaded rows) and opens the existing sound page; use counts can be capped, not global totals. No voice/image search is evidenced. | B |
| Sounds | Search → Sounds; sound topic page; sound reuse event to Shorts camera | Real sound attribution and sound-name records are reused. Verify creator restrictions, camera/editor handoff and media-worker-dependent mixing on a physical device. | B |
| Creator profiles | Tap creator/avatar or People search result → `ShortsCreatorProfile.tsx` | Shorts, Reposts, Playlists and About tabs; follow/unfollow, stats, playlist management, message, report and block paths exist. Public collections, profile sharing/link route and complete follower/following navigation remain incomplete or unverified. | C |
| Saved Shorts / history / collections | Player More menu → Saved Shorts / History; collection/playlist surfaces | Existing entry points and services are retained. Verify CRUD, privacy, ownership, cross-device persistence and history controls end to end. | B |
| Notifications | Shorts header More → Notifications | In-app activity, category/read/clear/preferences and comment/reply/mention trigger foundations exist. Comment-reaction notifications and reliable background push are not evidenced. | C |
| Privacy / safety / moderation | Player and comment More menus; report, block, mute, privacy and moderation services | Report/block/mute and audience controls have real service paths. Full creator moderation queue, appeals, hide/restrict controls, audit trail and end-to-end authorization still need coverage. | B |
| Context / provenance / TrueMode | Player More → Context and sources; creator declarations and remix lineage | Keep creator-declared origin distinct from independently verified evidence. Do not invent an independent provenance or TrueMode result where no authoritative service exists. Full context coverage remains incomplete. | C |
| Fresh Studio | Home Create, Studio bottom destination, Shorts Create/Camera and contextual create/remix/duet/quote/edit intents | One shared Studio app; Shorts workspace remains within it. Preserve dashboard, camera, import/upload, editor, templates, drafts, projects, analytics, earnings disclosures, publishing and return-to-origin. Full signed-in capture → project → edit → processing → publish → return journey is not yet verified. | B |
| System-to-Studio integration | Registry + `freshFlowStudioIntegration.ts` + shared Studio project service | Static contract verifies 24/24 system profiles and source-system metadata handoff. It does not establish that all 24 provider/editor/publishing destinations are operational. | B |
| Accessibility / safe areas / bottom navigation | Comment dialog semantics and focus handling; CSS safe-area/clearance rules; browser scripts | Escape close, focus containment/restoration, virtual viewport observation, reduced motion, 44px targets and player clearance have source/browser contracts. Physical Android keyboard, camera, microphone and screen-reader passes remain outstanding. | B |
| Offline / loading / recovery / performance | Feed and media states, pagination guards, performance policy/scripts | Loading, empty, offline and unavailable states exist in parts of the product. Verify every upload/comment failure, retry, duplicate submission, media cleanup, buffering and low-memory path. | B |
| Comment media security | `comment-media` storage bucket; new `20261124120000_fresh_comment_media_server_limits.sql` migration | Prior live inspection found public bucket reads, owner-folder writes and no server-side size/MIME limits. This PR adds a 50 MiB and MIME allowlist migration, but it is an unapplied owner-review artifact; no production setting or data was changed. Reassess private/restricted media delivery and retention before applying. | C |

### Latest CI diagnosis and corrective commits

The live PR head `69f828e95983af1bb1648ccffe1997c11c849262` had two completed failing jobs:

1. **Fresh Flow Navigation Browser Test** — 32 failures, all reporting that the eight top media tabs were below the required 44px minimum at 320, 360, 390 and 430px. The mobile `.fresh-shorts-header .fresh-flow-header-world-nav button` rule overrode the general 44px rule with 36px.
2. **Fresh Shorts Production Gate** — the comment accessibility source-contract test used an over-escaped regular expression for `FreshFlowReferenceDirection.css`, so it rejected the valid stylesheet import in `FreshFlowHub.tsx`.

Corrective commits on this branch:
- `f50f10e079134a7377536962dbad4e6e2f857059` — correct the stylesheet import assertion without removing it.
- `12cce069e8a753890322ce1e29eb07b904fecfc5` — restore the 44px minimum height for the mobile media-world navigation buttons.

The new head `12cce069e8a753890322ce1e29eb07b904fecfc5` triggered a fresh set of 14 workflows, including the Fresh Shorts Production Gate, Fresh Flow Navigation Browser Test, build gate, isolated PostgreSQL security and isolated migration replay. At the time of this inventory update, those runs were still in progress; no pass is inferred from a running status. Vercel was pending for this head. Recheck the exact current PR head and all checks before promoting or merging.

### PR and migration-description accuracy

The changed-file list includes `supabase/migrations/20261124120000_fresh_comment_media_server_limits.sql`. The migration is additive and unapplied by the engineer; it configures the existing `comment-media` bucket to 50 MiB and an explicit MIME allowlist for future uploads. Therefore the PR statement “No database schema ... is changed” is too broad if read as saying no database change file is included. The accurate statement is: **No production database schema, bucket setting, policy or data was changed; an additive, unapplied storage-bucket limits migration is included for owner review.**

### Verification boundary

- No A grade is awarded from this audit.
- Successful build, migration replay, RLS or static source contracts do not prove the signed-in user journey.
- Playwright browser tests are not physical Android-device verification.
- No Android soft keyboard, low-memory, camera/microphone permission or physical-device test is claimed.
- Do not merge PR #326 until the new-head workflows pass, the preview is exercised, the migration description is accurate, and remaining release gates are reviewed.
- All C/D requirements remain in scope. No capability is removed to make the interface simpler.


## 2026-11-24 live audit corrections and expanded backend evidence

**Code audit snapshot:** `b47d8e2ab0d19943fb51875460c84f6ec38d958d`  
**PR #326:** open; mergeable; 109 commits ahead of `main`, 0 behind; 27 changed files.  
**Important:** This section supersedes earlier optimistic grades where live repository or database evidence found a gap. No A grade is awarded.

### Specification reconciliation

- The original `Fresh_Shorts_Master_Product_and_Engineering_Specification.docx` was opened and its extracted 859-line contents reviewed as the historical baseline.
- The checked-in `docs/FRESH_SHORTS_MASTER_SPEC_SCOPE_RECONCILIATION_2026-11-24.md` was reviewed. It makes Fresh Studio / Create Studio part of Fresh Flow and supersedes only the prior exclusion; it does not remove the other master requirements.
- The separately named `Fresh_Shorts_Master_Specification_Reconciled_2026-11-24.docx` was not found in the accessible Library listing or checked repository paths. Do not claim that DOCX was reviewed; the Markdown scope addendum is the available reconciliation artifact.
- All repository edits in this session were committed through GitHub. No local repository checkout was available, so there was no separate local working tree to inspect.

### Corrected feature grades and access findings

| Requirement | Current user path / evidence | Corrected grade and remaining work |
|---|---|---|
| Fresh Flow Home shell and media-world directory | Fresh Flow Home → hero, top media navigation, expandable 24-system directory; bottom navigation → Home | **B** — shell and access paths exist. The Home recommendation cards are explicitly example content, not a live personalized cross-world recommendation feed; recommendation fulfillment is **C**. |
| Media worlds | Top media navigation: Discover, Videos, News / Posts, Live, VR / AR, Podcasts, Music, Others; Flow Switch and 24 Studio profiles | **B** — entry points and registry are present. Provider-specific worlds are not all complete; the current system experience explicitly leaves some artist/album destinations unbuilt. |
| Shorts discovery and player | Shorts → For You / Following / Friends / Trending / Fresh Picks / Learn / Relax; player rail and More menu | **B** — controls and secondary actions are discoverable. Real-media playback recovery, adaptive quality and device-level behavior still need verification. |
| Comments and threads | Player Comments → independently scrolling dialog, filters, composer, replies and attachment controls | **B** — responsive dialog, keyboard/focus handling, safe-area and stacking contracts are present. The browser run is synthetic and does not prove signed-in backend journeys. |
| Comment edit | Author comment menu / database | **D** — live `short_comments` has no UPDATE RLS policy and no `updated_at` column. Do not expose edit as working until a reviewed owner-scoped update/history design exists. |
| Comment reactions | Reaction picker → `short_comment_reactions` | **C** — see live duplicate CHECK constraint finding below. The expanded reaction UI is present, but eight newer values are rejected by the remaining legacy constraint. |
| Comment media | Comment composer → image/audio/video/file attachment | **C** — client and source-contract validation exist, but the live bucket is public-read and has no server-side size/MIME restrictions. The PR migration is unapplied. |
| Creator profile | Tap creator/avatar or People search → Shorts / Reposts / Playlists / About | **C** — four tabs exist and Reposts is backed by a real query. The master asks for Videos and Collections as distinct concepts; Shorts/Playlists are not yet demonstrated as complete equivalents. |
| Search and sounds | Header search → People, Shorts, topics, sounds and Web Info; sound result → sound page / reuse | **B** — real search RPC/fallback and stored sound-name grouping exist. Sound aggregation is capped at the 200 loaded rows; do not present it as a global usage count. |
| Reposts, shares and saves | Player action rail / More menu; creator profile Reposts tab | **B** — service paths and source contracts exist. Verify signed-in cross-device persistence and quote/repost lineage in the full browser journey. |
| Notifications | Shorts header More → Notifications | **C** — in-app tabs and read/clear/preferences foundations exist. Some signed-out/device-local states are explicitly local-only; complete cross-device and background push delivery is not verified. |
| Context, provenance and TrueMode | Player More → Context and sources | **C** — preserve creator declarations and source lineage, but do not present a declaration as independent verification. Full lineage and recommendation-explanation coverage remain outstanding. |
| Shared Fresh Studio shell | Fresh Flow Create, bottom Creator Studio, Shorts create handoff | **B** — one embedded shared Studio app; the Shorts workspace is a section within it, not a second editor. The 24-profile static contract passes. |
| Shorts-to-Studio provenance | Shorts Create/Remix/Duet/Quote/Edit → shared Studio publishing dashboard | **C** — session-scoped create intent carries action, source Short ID, source creator ID, media URL and caption. The dashboard reads it and pre-fills caption; publish maps source Short ID for remix/duet. However source creator/media URL are not persisted to draft/published records, quote lineage is not stored, and direct Shorts publishing does not persist `sourceSystemId` to the publish record. Generic Studio project creation does persist its system ID. Edit/collaborate/effects/captions intents are not all implemented as complete workflows. |
| Studio templates and complete creation | Shared Studio → Create / Projects / device tools / Publish | **C/D** — dashboard, projects, device tools, editing and publishing foundations exist. The current Create Project surface explicitly reports templates unavailable and continuing an existing project unavailable; not all system-specific editors are complete. |
| Return-to-origin | Shorts create intent → Studio → publish/back | **C** — feed refresh and return callbacks exist, but source context is not fully persisted through draft/publish and the complete origin-return journey is not yet verified. |
| Mobile / accessibility | Browser viewports 320/360/390/430px; dialog semantics and focus behavior | **B** for browser-emulated viewport coverage. **Not verified** on a physical Android device, keyboard, camera/microphone permissions, screen reader or low-memory hardware. |
| Performance / offline / recovery | Feed pagination, media states, database and browser contracts | **C** — partial loading/empty/error/offline handling exists; full low-bandwidth retry, upload recovery, background processing and offline journeys remain unverified. |

### Live Supabase findings (read-only inspection; no production mutations)

Project status was healthy. The health advisor returned no findings. The following live schema/policy findings are material to Fresh Flow / Shorts:

1. **Duplicate reaction constraints:** `public.short_comment_reactions` has both `short_comment_reactions_type_check` (the legacy 10-value check) and `short_comment_reactions_reaction_type_check` (the expanded 18-value check). The applied widening migration drops/recreates the latter name but does not drop the legacy `short_comment_reactions_type_check`. PostgreSQL enforces both, so the eight newer values — Curious, Inspire, Insightful, Agree, Disagree, Helpful, Question and Respect — remain rejected. A corrective migration has now been added to this PR as `supabase/migrations/20261124150000_fix_short_comment_reaction_constraints.sql`. It drops both the legacy narrow constraint and the previous widened constraint, recreates one canonical 18-value constraint, validates existing rows, and changes no reaction data. It is not applied to production; production still requires the normal reviewed migration release.
2. **Comment editing:** `short_comments` has no UPDATE policy and no `updated_at` column. Owner delete and insert paths exist; editing remains D.
3. **Attachment storage:** the live `comment-media` bucket is `public=true`, with `file_size_limit=null` and `allowed_mime_types=null`. Public reads and owner-folder writes/deletes exist. The new `20261124120000_fresh_comment_media_server_limits.sql` migration is not in the live migration ledger and has not been applied. It sets a 50 MiB limit and MIME allowlist but does not change public-read behavior.
4. **Draft and social access:** `creator_drafts` has owner-scoped SELECT/INSERT/UPDATE/DELETE policies. `short_comment_reactions` writes are owner-scoped but rows are publicly readable. `short_reposts` has public read and owner-scoped write paths.
5. **Sound reuse privacy:** `short_sound_reuse_allowed(uuid)` is SECURITY DEFINER and executable by anon; it returns a creator's `sound_reuse_allowed` boolean. Confirm that this preference is intentionally public and keep the function limited to that boolean.
6. **Security advisor:** broader project findings include 30 RLS-enabled tables without policies, 4 anon-callable and 16 authenticated-callable SECURITY DEFINER functions, and leaked-password protection disabled. These include systems outside Fresh Flow; review individually rather than adding blanket policies.
7. **Performance advisor:** 82 RLS init-plan warnings, 7 unindexed foreign keys, 8 multiple-permissive-policy warnings and 123 currently unused indexes. Shorts-related RLS warnings include `short_reposts`, `saved_shorts`, `short_comment_reactions`, `short_captions` and `short_gifts`; unindexed foreign keys include `short_appeals.appellant_id` and `short_moderation_decisions.report_id`; `fresh_short_collection_items` has multiple permissive SELECT policies. Several Shorts indexes are currently reported unused. Do not drop indexes from a single low-traffic snapshot; first collect representative query and usage evidence.

### Latest CI, deployment and browser evidence

- On `ff1d6eafbe71794d41e0e3439b8ed64549fcc7ec`, the two-navigation layout checks passed at 320/360/390/430px, but the broader browser script reported 4 failures out of 472 because its profile-tab assertion expected the old `Shorts / Playlists / About` layout.
- The product profile already contains `Shorts / Reposts / Playlists / About`. The browser contract was corrected to expect the four tabs and verify Reposts is selectable in commit `b47d8e2ab0d19943fb51875460c84f6ec38d958d`.
- On `b47d8e2`, Fresh Shorts Production Gate passed, including comment accessibility, search/sounds, Reposts and comment-media contracts. Fresh Web Lite build gate passed TypeScript, production build, lint, Studio contracts and Phase 15–24 certification. Isolated PostgreSQL security tests, isolated full migration replay, Fresh Connect RLS, Fresh ID, Fresh AI integrity/training, Fresh Mail, Fresh Knowledge Retrieval, TRUEMODE and Long Video Analytics checks passed.
- The Fresh Flow Navigation Browser Test is the remaining check at this snapshot. Its two-navigation layout step passed; the full Shorts pager/comment-dialog interaction step for 320/360/390/430px was still running. Recheck it on the latest PR head before merge.
- Vercel preview for `b47d8e2` is READY: [preview](https://fresh-web-lite-7h4zsll07-kanarafat54-boops-projects.vercel.app). `/` and `/flow/shorts` returned HTTP 200, as did the JS/CSS assets. Netlify preview status is successful. No Vercel runtime error logs or unresolved toolbar threads were returned; absence of logs is not proof of an error-free client session.
- No physical Android device test is claimed. No production deployment, migration application, production data mutation or PR merge occurred.

### Release decision

PR #326 remains open and unmerged. Do not merge until the latest-head navigation browser test passes, the current preview is rechecked, and owners explicitly resolve the reaction-constraint migration, comment-media exposure/limits, and remaining source-context gaps. C/D requirements remain in scope; none are removed to make the interface simpler.


## 2026-11-24 comments modal and bottom-navigation correction

**Implementation commits:** `371fd60`, `645b958`, `244c3ec`, `476d808`, `52c017a`, `417949d` (see branch history for full SHAs).

### Product decision
When a user opens the Shorts Comments panel, the Fresh Flow bottom navigation must not be displayed. It is unrelated to the active comment task, consumes scarce screen space, visually competes with the composer, and can imply that navigation remains part of the active surface. The comments sheet is now treated as a focused modal interaction. The six destinations remain available as soon as the panel closes; no navigation destination or route is removed.

### Changes made
- The existing `fresh-flow-comments-visibility` event now tells Fresh Flow to hide the bottom bar while comments are open and restore it on close.
- The comments backdrop no longer reserves 68px for the bottom navigation. It uses the full lower viewport while respecting device safe areas.
- The dialog now exposes `aria-modal="true"`.
- Keyboard focus is trapped inside the comments panel in both Tab directions; Escape and the close control dismiss it; focus returns to the original Comments trigger.
- Comment list scrolling remains independent and does not accidentally reveal the bottom bar while the modal is open.
- Browser coverage now checks the bottom bar is hidden during comments, returns after Escape and close-button dismissal, and focus wraps within the modal.

### Grade and verification
- Comments UI/modal accessibility: **B pending CI rerun**. The underlying comment CRUD, reaction constraint and media storage findings recorded above remain separate backend gaps; this presentation change does not resolve them.
- Bottom-navigation behavior while comments are open: **B pending CI rerun**. The previous behavior intentionally left the bar visible; this change corrects that interaction based on the product-owner direction.
- Automated tests updated: `scripts/browser-test-fresh-shorts.mjs` and `scripts/test-fresh-shorts-comment-accessibility.mjs`.
- Latest code head at the time of this entry: `417949d0598ba2a2d474db050125a2e1b27061da`. GitHub Actions validation was triggered for the preceding code head and is being rechecked on the final documentation head. Do not claim browser or CI success until the new run completes.
- No production database mutation, migration application, PR merge or production deployment was performed.


### Follow-up: corrective comment reaction migration prepared

- Added `supabase/migrations/20261124150000_fix_short_comment_reaction_constraints.sql` after the prior widened migration.
- The migration drops both competing CHECK constraint names, creates one canonical 18-value CHECK constraint, validates existing rows and reloads the PostgREST schema cache.
- No reaction rows are deleted or rewritten. The migration has not been applied to production.
- `scripts/test-fresh-shorts-comment-reactions.mjs` now asserts both old constraint drops, canonical recreation, validation and preservation of all 18 reaction values.
- Grade remains **B pending isolated migration replay and release** until CI proves the entire migration chain and production deployment applies it through the approved release process.
