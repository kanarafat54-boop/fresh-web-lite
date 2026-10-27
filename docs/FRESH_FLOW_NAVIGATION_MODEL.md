# Fresh Flow Navigation Model: Frequent Destinations, Contextual Tools, Open Media

**Status:** Proposed implementation contract.  
**Scope:** Fresh Flow only. The universal Fresh Web Lite Home and its existing Flow entry point must remain unchanged.

## Decision

The user's principle is sound: **keep the most-used media destinations easy to reach; show secondary controls when the task calls for them; make every supported capability discoverable.**

Do not permanently expose every route, tool, creator setting, moderation action, media type, and experimental feature at once. That would create clutter, especially on small screens. But contextual visibility must never become a dead end: every supported feature needs a predictable, accessible route through search, a hub, a menu, a profile/studio, or a contextual action.

## Two persistent navigation bars plus contextual tools

Fresh Flow should use **both top and bottom navigation on mobile**, with different responsibilities. This is a refinement of the earlier three-layer model, not a replacement for contextual controls or universal discovery.

### Top navigation — identity, search, and in-world discovery

The top area should contain Fresh Flow identity, prominent universal search, and compact access to notifications/profile. A media-world switch (Flow Switch) remains available for moving between the six current worlds and future formats. Wallet and appearance controls should not crowd the narrowest viewport; they can remain available through their existing routes/settings when space is constrained.

A second, horizontally scrollable **in-world discovery row** may sit below the header and change with the active world:
- Shorts: For You, Following.
- Long videos: Discover, Following, Live (only when live is operational).
- News/Posts: News, Posts, Following, Topics.
- Podcasts: Discover, Following, Episodes, Shows.
- AR/VR and Others: relevant experience categories.

Do not hide a required item behind an undisclosed horizontal scroll. Use clear overflow affordance or wrap/scroll behavior that is discoverable and accessible. In immersive playback, chrome may recede, but essential exit and safety controls must remain accessible.

### Bottom navigation — stable, thumb-friendly destinations

Use a stable bottom bar on narrow/mobile screens with no more than five clear destinations. The initial proposal is:
- **Home** — the Fresh Flow overview / default short-feed entry (keep the existing route stable until the overview-vs-Shorts behavior is deliberately resolved).
- **Videos** — long-form video world.
- **Posts** — News / Posts world.
- **Create** — opens the existing creation/studio route only if its handler and route are confirmed; otherwise it must not appear as a dead button.
- **More** — opens the Flow Switch / full media directory, including Podcasts, AR/VR, Others, and future formats.

This is a starting hypothesis to validate, not a claim that these are Fresh Flow's measured most-used destinations. If the existing Create route cannot be safely opened from this shell, use **Explore** as the fourth destination until that route is verified. Keep labels visible alongside icons on common phone widths where feasible; use adequate touch targets, safe-area padding, active-route state, and accessible names. Do not duplicate the same six-world list in both bars.

### 1. Primary destinations — frequent tasks

Keep this small and stable. The first launch should use a deliberate default based on common cross-platform behavior, not pretend we already know Fresh Flow's own usage data.

Search stays conspicuous in the top bar. The bottom bar owns the most stable destinations, while the top discovery row changes with the selected media world. Create, profile/library, and live discovery should be easy to find but should not all compete for permanent bottom-bar slots on narrow screens. The exact set must be checked against existing route handlers and the actual app layout before implementation.

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

The current code already has useful foundations:
- `src/features/fresh-flow/core/freshFlowArchitecture.ts` describes “Massive underneath. Minimal on the surface.” and models six media worlds with per-world discovery modes.
- `src/features/fresh-flow/FreshFlowHub.tsx` renders a top header and a six-destination horizontal world row, plus Flow Switch, search, appearance, wallet, and profile. It currently has no persistent bottom bar in this shell; its “Home” route is also the Shorts experience, which must be handled deliberately rather than silently redefined.
- `src/app/navigation/navModel.ts` keeps Fresh Flow separate from global Home. The global Home and its Fresh Flow entry must not change.

Implementation must first confirm the actual route/handler for Create, verify where Explore/full-world selection belongs, then add the bottom bar and make the top row contextual. Preserve all six existing world routes and deep links. Avoid a second redundant six-item row. Do not change the global `feed`/Home route or its Fresh Flow entry.

## Required verification before shipping

- Test at 320, 360, 390, 430 CSS-pixel widths and desktop.
- Verify both top and bottom navigation at 320, 360, 390, 430 CSS-pixel widths and desktop; labels must not clip, wrap unpredictably, or become tiny, and controls need clear accessible names and usable touch targets.
- Verify the bottom bar respects Android safe-area insets, does not cover media captions/action controls, and is hidden or transformed safely during immersive playback.
- Verify keyboard focus, screen-reader order, contrast, reduced motion, and safe-area spacing.
- Test route transitions, browser/back behavior, deep links, active-route highlighting, and Flow Switch dismissal.
- Confirm every supported destination has a real route/handler and sensible loading, empty, offline, error, and permission-denied states.
- Confirm global Home remains unchanged.
- Use real analytics only when available; until then label the primary set as a product decision to validate, not “most-used” telemetry.
