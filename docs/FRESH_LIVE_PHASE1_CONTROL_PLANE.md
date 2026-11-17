# Fresh Live — Phase 1 Control Plane

**Status:** Implementation on branch `feature/fresh-live-phase1-control-plane`  
**Date:** 17 November 2026  
**Scope:** Durable session model, RLS, authenticated API, media adapter stub, state machine. **No media plane. No paid infrastructure.**

## What this phase delivers

| Deliverable | Path / note |
|-------------|-------------|
| Session + participant tables | `supabase/migrations/20261117120000_fresh_live_session_core.sql` |
| RLS (owner + public discoverability rules) | Same migration |
| Authenticated API | `api/live/sessions.ts` |
| Provider-neutral media adapter | `src/core/live/mediaAdapter.ts` (`NotConfiguredMediaAdapter` default) |
| Session state machine | `src/core/live/sessionStateMachine.ts` |
| Contract verification | `scripts/verify-fresh-live-session-contract.mjs` |
| Non-prod migration guide | `docs/FRESH_LIVE_MIGRATION_APPLY_GUIDE.md` |

## Explicit non-goals (this phase)

- No WebRTC / RTMPS / HLS / SFU integration
- No stream keys or media credentials issued to clients
- `start` returns **503 `LIVE_MEDIA_NOT_CONFIGURED`** until a real media adapter is approved and `isConfigured()` is true
- No claim that any session is operationally LIVE
- No production migration or merge without owner approval

## State machine (server-enforced)

```
draft → scheduled | ready | cancelled
scheduled → ready | cancelled
ready → live* | cancelled | failed
live* → ending | interrupted | failed
...
```

\* Transition into `live` requires `mediaConfigured === true` from `LiveMediaAdapter.isConfigured()`. The default adapter always returns false.

## Media adapter

```ts
import { getLiveMediaAdapter } from "../src/core/live/mediaAdapter.js";

const adapter = getLiveMediaAdapter();
if (!adapter.isConfigured()) {
  // refuse start / refuse LIVE
}
```

Replace only via approved server bootstrap or `setLiveMediaAdapterForTests` in tests.

## How to verify (static)

```bash
npm run test:fresh-live-session-contract
```

## Next steps (require approval)

1. Apply the migration on a **non-production** Supabase project (see migration guide).
2. Add RLS/behavioral tests against that database.
3. Evaluate free-first media providers; do not activate paid plans without approval.
4. Implement a real adapter + host→viewer path (Phase 2 exit gate).

## Safety posture

- Secret keys stay server-side only.
- Client never receives long-lived stream credentials.
- Discovery only surfaces public, non-draft sessions.
- Private/draft sessions are invisible to non-creators.
- Control plane alone cannot mark a session LIVE.
