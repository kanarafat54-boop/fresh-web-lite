# Fresh Flow Navigation Model: Frequent Destinations, Contextual Tools, Open Media

**Status:** Proposed implementation contract.  
**Scope:** Fresh Flow only. The universal Fresh Web Lite Home and its existing Flow entry point must remain unchanged.

## Decision

The user's principle is sound: **keep the most-used media destinations easy to reach; show secondary controls when the task calls for them; make every supported capability discoverable.**

Do not permanently expose every route, tool, creator setting, moderation action, media type, and experimental feature at once. That would create clutter, especially on small screens. But contextual visibility must never become a dead end: every supported feature needs a predictable, accessible route through search, a hub, a menu, a profile/studio, or a contextual action.

## Three navigation layers

### 1. Primary navigation — frequent destinations

Keep this small and stable. The first launch should use a deliberate default based on common cross-platform behavior, not pretend we already know Fresh Flow's own usage data.

Suggested initial mobile structure:
- **Flow Home / Discover** — a media overview and user-steerable discovery.
- **Shorts** — quick vertical viewing.
- **Videos** — long-form viewing and series.
- **Posts** — news, articles, images, and community posts.
- **More / Explore** — Podcasts, AR/VR, emerging formats, and the full media directory.

Search should remain conspicuous in the Fresh Flow header. Create, profile/library, and live discovery should be easy to find but should not all compete for permanent bottom-bar slots on narrow screens. The exact primary set should be validated against the existing app layout and actual usage before implementation.

This is a proposed default, not a claim that those are already Fresh Flow's most-used destinations. When real usage data becomes available, evaluate aggregate navigation opens, successful task completion, repeat use, and user feedback. Avoid tracking sensitive content unnecessarily; provide privacy controls and minimum aggregation thresholds.

### 2. Contextual navigation — tools for the current task

Only show the controls relevant to the current state, user role, and service readiness.

| Context | Appropriate contextual controls |
|---|---|
| Watching a short | Like/react, comment, share, save, creator profile, not interested, report |
| Watching a long video | Play/pause, seek, captions, quality when supported, chapters, playlist, save/share |
| Reading a post or article | Read controls, source/provenance, related topic, save, share, discuss, report |
| Listening to audio | Play/pause, seek, speed, queue, transcript when available, background-play status |
| Creating or editing | Format-specific editor, draft/save, preview, accessibility checks, publish/schedule only if supported |
| Hosting a live session | Host controls and audience/moderation tools, only when the actual live service is operational |
| Creator profile/dashboard | Published work, drafts, series, genuine analytics, eligibility/status and settings |
| Administrator/moderator task | Authorized moderation and operational actions; never expose privileged controls to ordinary users |
| Immersive AR/VR experience | Minimal entry/exit and safety controls, with permissions explained before use |

Contextual controls must be discoverable, keyboard/screen-reader accessible, large enough to tap, and recoverable if they collapse. Do not hide essential safety, pause, exit, captions, report, or permission controls behind a gesture alone.

### 3. Universal discovery — all supported media and destinations

Every supported format or capability must be reachable through one or more clear routes:
- Universal Fresh Flow search with filters for media type, creator, topic, series, and community.
- A browsable media directory / Explore destination.
- Related content, creator profiles, and topic hubs.
- Create menu that lists only supported creation flows.
- Library for saved items, playlists/collections, history, and continue-watching/listening when supported.
- Profile / Creator Studio for creator-owned content and tools.
- Contextual entry points when a capability is relevant.

“Others” should be a gateway to a discoverable directory, not an indefinite miscellaneous bucket. New media types should be registered with their label, icon, renderer/player, metadata schema, access rules, safety handling, and required service capabilities. Do not add a permanent primary navigation item for every new format.

## Visibility and readiness rules

A destination can be:
- **Primary:** frequent and broadly useful.
- **Contextual:** useful in a specific task or role.
- **Discoverable:** available from search, Explore, a hub, or a relevant menu.
- **Experimental:** explicitly labelled as such and restricted by feature flag.
- **Unavailable:** shown with a clear explanation only when useful; never presented as working when its backend is absent.

Role- or permission-specific controls must be authorized by the backend, not merely hidden in the UI. Service-dependent features (e.g., live streaming, payouts, advanced analytics, immersive runtime) should be exposed as operational only after end-to-end validation.

## How to choose what is “most used”

At launch, use the proposed default and test it with representative user journeys. After release, reassess using privacy-conscious aggregate signals:
1. Destination opens and repeat use.
2. Task success (e.g., found and played, saved, created or published successfully).
3. Time/steps to complete the user's intended task.
4. User feedback, accessibility testing, and abandonment/error rates.
5. Device constraints, including narrow screens and low-bandwidth use.

Do not rank solely by clicks, watch time, or advertising value. Do not infer that a feature is valuable simply because it is prominent. Avoid collecting sensitive viewing histories for navigation decisions unless necessary, disclosed, and appropriately controlled.

A future personalization layer may allow users to pin, reorder, or hide selected destinations. It must not remove a predictable way to reach core features, and must preserve sensible defaults for new users.

## Current implementation evidence and gaps

The current code already has several helpful foundations:
- `src/features/fresh-flow/core/freshFlowArchitecture.ts` describes a layered architecture (“Massive underneath. Minimal on the surface.”) and models six media worlds.
- `src/features/fresh-flow/FreshFlowHub.tsx` currently renders a persistent six-destination world navigation and also provides a Flow Switch, universal search entry, appearance controls, wallet, and profile.
- `src/app/navigation/navModel.ts` keeps Fresh Flow separate from global Home and places secondary global destinations in the global “More” navigation on mobile.

Therefore the principle does not require a new architecture from scratch. The next task is to inspect the actual responsive CSS and interaction behavior, determine whether all six persistent world links fit comfortably on small screens, and prototype a compact primary navigation plus accessible full-world picker/Explore directory. Do not change the global `feed`/Home route or its Fresh Flow entry.

## Required verification before shipping

- Test at 320, 360, 390, 430 CSS-pixel widths and desktop.
- Verify navigation labels do not clip, wrap unpredictably, or become tiny; all controls have clear accessible names and usable touch targets.
- Verify keyboard focus, screen-reader order, contrast, reduced motion, and safe-area spacing.
- Test route transitions, browser/back behavior, deep links, active-route highlighting, and Flow Switch dismissal.
- Confirm every supported destination has a real route/handler and sensible loading, empty, offline, error, and permission-denied states.
- Confirm global Home remains unchanged.
- Use real analytics only when available; until then label the primary set as a product decision to validate, not “most-used” telemetry.
