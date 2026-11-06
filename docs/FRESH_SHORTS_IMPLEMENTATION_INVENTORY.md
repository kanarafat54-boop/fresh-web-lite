# Fresh Shorts — implementation inventory (P0 repository audit)

Baseline: `Fresh_Shorts_Master_Product_and_Engineering_Specification.docx` (Parts 1–18). Fresh Studio is excluded.
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
| Creator and publishing entry (Part 8) | Out of scope boundary | `publishFreshShort.ts`, `ShortsCreateCamera.tsx` | Studio editing is excluded; publish status and remix attribution display only. |
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
- Fresh Studio stays out of scope.

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

Current audited `main`: `fe884acd247df5066952712b680426c45a088109` (2026-11-05 21:18 UTC).
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
| #227 | Context and sources panel | Shorts gate and navigation passed; preview ready | **Not merge-ready:** typecheck/build/backend-contract/long-video-analytics checks fail because `Short.authorVerified` is optional while `ContextShort.authorVerified` is required at the panel boundary. Normalize unknown to `false` or make the context contract optional, then rerun all checks |
| #228 | Duration/language filters and working remix/duet filter | Shorts gate, typecheck/build, migration replay, navigation and backend checks passed; previews ready | Additive migration `20261106100000_fresh_shorts_duration_language.sql` is not in `main`; review and owner application required. Language records the creator device language, not detected speech language |

Current-main validation evidence:
- The main commit's aggregate status is successful; the Fresh Shorts gate, build, typecheck-related checks, navigation and PostgreSQL persistence checks reported success.
- The Supabase Preview check is **failing** with: `Remote migration versions not found in local migrations directory.` This is migration-history drift and must be reconciled before relying on Supabase branch previews.
- Successful PR previews are not production releases. No production database migration is considered applied based only on repository presence or CI replay.
- No physical Android device test is evidenced by this audit. The browser tests at narrow viewport widths are useful regression evidence, not a substitute for an actual Android device pass.

Re-audit conclusion:
- The strongest existing implementation remains the integrated Shorts pager and shared comment system, including text/audio/video/image attachments and parent-child replies. Treat these as **Partial** until the complete UI-to-persistence flows and failure handling are verified on a live signed-in session.
- Do not rebuild the pager, comment engine, playlists, pinned comments, routes, or filters already merged or in review.
- First repair and rerun PR #227's type boundary; then review #224, #226 and #228 against current `main` and their migrations. Keep the Supabase migration-history failure visible as a separate release gate.
- Fresh Studio remains outside this specification and is not included in this work.
