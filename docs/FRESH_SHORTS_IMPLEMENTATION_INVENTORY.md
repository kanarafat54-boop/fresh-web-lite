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
| Fresh Flow shell and navigation | `FreshFlowHub.tsx`, `FreshFlowHome.tsx`, `freshFlowArchitecture.ts`, `freshFlowSystemRegistry.ts` | Implemented in code; browser/device verification pending | Route transitions, deep links, back behavior, global Home separation, responsive navigation |
| Shorts discovery and playback | `FreshFlowShortsExperience.tsx`, `FreshFlowShortsStream.tsx`, `shorts/*`, `shortsPerformance.ts` | Implemented in code; end-to-end verification pending | Real media, feed ordering, playback/retry/buffering, URL synchronization, accessibility and device pass |
| Search, topics, filters, recommendations | `ShortsExplore.tsx`, `ShortsTopicPage.tsx`, `shortsExplore.ts`, `shortsFilters.ts`, recommendation controls | Implemented in code; data coverage and behavior need verification | Search source, filter combinations, empty/error states, recommendation controls |
| Comments and social interactions | Shared `CommentPanel.tsx`, comment reaction code, universal interaction adapter and migrations | Implemented in code; persistence/security coverage must be rechecked | Text/audio/video/image comments, nested replies, all reaction types, repost/share/save, RLS and failure handling |
| Creator profiles and community | `ShortsCreatorProfile.tsx`, playlists, follow state and notifications | Implemented in code; live user journey pending | Follow/unfollow persistence, profile tabs, playlists, notification delivery |
| Sounds and reuse | `shortsSound.ts`, `soundReuse.ts`, sound topic/reuse UI and migration | Implemented in code; physical-device mixing verification pending | Permission checks, attribution, block/privacy enforcement, camera/editor handoff |
| Context, captions and provenance | Context/provenance panels, captions and supporting services | Implemented with explicit limits; not equivalent to independent fact verification | Verify creator-declared vs independently verified origin labels, source links, caption timing and service failure |
| Safety, privacy and moderation | Privacy, reporting, moderation, appeals and user-block services/components | Implemented in code; live policy and reviewer workflow pending verification | RLS/API authorization, appeals, admin-only review boundary, block/mute behavior, auditability |
| Saved, history and collections | Saved/history sheets, playlists/collections services and migrations | Implemented in code; complete persistence path pending verification | Save/remove, collection CRUD, history clear, cross-device state and ownership tests |
| Notifications | `ShortsNotifications.tsx`, activity and notification state/delivery services | Implemented in code; delivery scope must be represented truthfully | In-app state, category preferences, quiet mode, foreground-only browser notifications vs true push |
| Create Studio integration | `FreshFlowHub.tsx` routes the Studio system through `FreshFlowSystemExperience.tsx` to `FreshStudioApp.tsx`; `freshFlowStudioIntegration.ts`, `StudioProjects.tsx`, `ShortsCreateCamera.tsx`, `fresh-studio/*`; `ShortsStudio.tsx` is present but no active import/render call site was found in the current code search | Shared Studio architecture and origin handoff are present; Shorts-specific dashboard component appears unwired and must be reconciled into the shared Studio rather than discarded or treated as a second studio | Verify every origin handoff, Shorts drafts/publishing/analytics parity, project persistence/versioning, editor capability, media pipeline, processing and authorized publishing |
| Reliability, performance and accessibility | Shorts state screens, Data Saver, telemetry, performance scripts and browser tests | Automated coverage exists; physical Android review not evidenced here | Run all gates, keyboard/focus/contrast/reduced motion, 320–430px layouts, slow/offline/permission-denied states and real Android testing |

### Creator Studio integration contract

The repository's `verify-fresh-flow-studio-integration.mjs` asserts 24 registered Fresh Flow systems, 24 matching Studio profiles, valid media kinds/workspaces, explicit implementation statuses, creation intents, capability dependencies, shared services, and preservation of originating system metadata through project creation/loading and Studio launch. The active Fresh Flow Studio route loads `FreshStudioApp` through `FreshFlowSystemExperience`; `ShortsStudio.tsx` exists but was not found as an active import/render call site by repository code search. That is a reconciliation gap: carry its Shorts-specific overview, drafts, videos, analytics and creator controls into the shared Studio workspace without dropping them or introducing a second Studio. This is a static contract check; it does not prove every editor, provider, upload worker, or publishing destination is production-ready.

### Current repository / PR notes

- Main inspected at `fbd72a54cf4a29ec5682cf9691630cf639823c84`.
- PR #324 is open and concerns restoration of reaction read policies and owner-scoped post-reaction updates. Its description reports isolated migration replay and behavioral tests passed; it is not merged and must be reviewed independently.
- PR #325 is open/draft and concerns bounded News / Posts pagination. It is adjacent Fresh Flow work, not a reason to replace or bypass the shared pagination contract.
- Do not infer production database state from migration files or isolated replay. Confirm live migration status before claiming production behavior.
- No physical Android device validation is evidenced by this repository inspection.

### Grading rules for the next implementation pass

Use four explicit grades:
- **A — Verified:** implementation plus automated and relevant end-to-end/browser/device tests, including persistence and failure paths.
- **B — Implemented, verification incomplete:** substantial code exists but one or more real user journeys or environments are not proven.
- **C — Partial:** only part of the specified behavior exists, or integration is incomplete.
- **D — Missing / blocked:** no safe implementation exists yet, or a required provider/owner decision is unavailable.

A grade is not a deletion decision. Every B/C/D item remains in the preservation ledger with its evidence, gap, dependency and next action. Do not downgrade a feature merely because its provider is not yet connected; record the capability boundary honestly and retain the existing foundation.
