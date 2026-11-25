# Fresh Shorts visual reference — engineering contract

Status: active implementation specification, updated 2026-11-25.

## Screen ownership
- Fresh Flow Home owns the global Home header controls: notifications, add/create, camera and profile.
- The Shorts header keeps the Fresh Shorts brand, Search and More (⋯). Do not duplicate Home-only controls inside Shorts.
- Shorts remains part of the existing Fresh Flow shell and five-destination parent navigation.

## Discovery
- Primary row, in order: Fresh Picks, Learn, Relax, For You. Search and More remain in the Shorts header.
- Secondary row, in order: Trending, Friends, Following.
- Both rows are compact and horizontally scrollable where needed; neither may obscure the video or creator metadata.
- Preserve existing discovery IDs, ranking, filters, feed state and deep-link behavior.

## Player and interactions
- Keep the vertical player as the dominant surface.
- Keep core actions on the right rail; the rail arrow opens the existing expandable More actions panel beside the rail.
- Keep comments in a resizable bottom sheet. Target approximately 66% of viewport height initially, with keyboard-aware resizing.
- Creator download permission is opt-in per Short, stored in `shorts.allow_download` with a default of `false`. Only the creator can change it; the official viewer Download action appears only when enabled.
- The shared server API verifies the viewer's Fresh ID session and reads the persisted permission before issuing a 60-second signed attachment URL. Keep the service key server-side.
- Current `post-videos` storage is still a public bucket for backwards-compatible playback. This gates Fresh's official download action; it is not DRM and cannot prevent a viewer from saving an already-public media URL. A later private-bucket cutover requires migrating playback and creator media flows together.
- Preserve sound attribution, remix permissions, reporting, blocking and recommendation controls.

## Viewer library and history
- Watch History exists and must have a user-controlled pause/disable setting, plus remove-one and clear-all controls. When disabled, no new history events are recorded; disabling history must not silently erase previously saved history.
- Viewers can create personal collections with `public` or `private` visibility. Private visibility must be enforced server-side with owner-scoped authorization, not merely hidden in the UI.
- Preserve existing creator playlists and Saved / Liked / Reposted views; do not conflate them with personal collections.

## Fresh Context
- Fresh Context is available when relevant and shows source attribution, useful context and uncertainty boundaries.
- Distinguish creator declarations, AI-generated explanations and independently supported evidence. Never label an automated explanation as a human fact-check.

## Acceptance
- Preserve existing Shorts, comments, creator, Studio, media and parent-navigation journeys.
- Verify 320, 360, 390 and 430 CSS-pixel widths, keyboard-open behavior, touch targets, safe areas and narrow-screen overflow.
- Run the Fresh Shorts production gate, TypeScript check, lint and production build before claiming the slice is verified.
- Do not apply database migrations or change live Supabase state without explicit owner approval.
