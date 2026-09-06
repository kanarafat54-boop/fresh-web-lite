# Fresh Flow Production Gate

Fresh Flow follows the project TRUEMODE boundary:

`Design → Architecture Review → Implement → Static Analysis → Integrate → Unit/Integration Tests → Build → Deploy → Smoke Test → Route Verification → Mobile Verification → Performance Verification → Rollback Readiness → Proceed`

## Architecture lock

Fresh Flow owns one media system with these directorates:

1. Home — Fresh Shorts
2. Long Videos
3. News / Posts
4. AR / VR
5. Podcasts
6. Others

Fresh Shorts is the Home experience. A second standalone Shorts implementation must not be introduced.

## Shorts runtime contract

- One active video at a time.
- Vertical native scrolling with `scroll-snap-type: y mandatory`.
- Active-only playback.
- Runtime media window around the active item.
- Adaptive preload based on connection quality.
- Bounded retry without replacing the player element.
- Pagination ahead of the viewport.
- Duplicate elimination when pages are appended.
- Offline-aware pagination.
- Session playback position restoration.
- Five continuous seconds of actual playback before immersive transition.
- Gift action remains available through the existing interaction path.
- Playback, buffering, first-frame, error and immersive telemetry are captured without storing account IDs or user-entered content.

## Verification layers

### Automated

- `npm run test:shorts` — static architecture/contract checks.
- `npm run lint` — lint gate.
- `npm run build` — TypeScript + Vite production build.
- `.github/workflows/fresh-shorts-gate.yml` — non-mutating CI gate on `main` and pull requests.

### Production

- Vercel deployment must reach `READY`.
- Production route must return HTTP 200.
- Vercel runtime must be checked for error/fatal events.
- `/api/shorts/telemetry` must accept only the bounded event contract.

### Still requiring physical-device verification

- Android touch swipe/snap behavior.
- Background/foreground playback recovery.
- Rotation and viewport resize.
- Weak-network buffering and recovery.
- Memory pressure while rapidly swiping.
- Real first-frame/startup latency and p95/p99 measurements.

These are not marked complete until observed on a real device/network.

## Non-goals of this gate

- This does not claim a billion-scale CDN/transcoding pipeline already exists.
- This does not claim a complete media intelligence pipeline already exists.
- This does not claim News has a distinct source model yet.
- This does not claim end-to-end Research → Truth Decision → Supabase persistence has passed until a real research claim creates persisted rows.
