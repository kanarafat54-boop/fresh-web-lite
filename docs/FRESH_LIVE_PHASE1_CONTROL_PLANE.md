# Fresh Live — Phase 1 Control Plane

**Status:** Implementation started on branch `feature/fresh-live-phase1-control-plane`  
**Date:** 17 November 2026  
**Scope:** Durable session model, RLS, authenticated API. **No media plane. No paid infrastructure.**

## What this phase delivers

| Deliverable | Path / note |
|-------------|-------------|
| Session + participant tables | `supabase/migrations/20261117120000_fresh_live_session_core.sql` |
| RLS (owner + public discoverability rules) | Same migration |
| Authenticated API | `api/live/sessions.ts` — actions: `create`, `get`, `list_mine`, `list_discover`, `prepare`, `end`, `cancel` |
| Contract verification | `scripts/verify-fresh-live-session-contract.mjs` |

## Explicit non-goals (this phase)

- No WebRTC / RTMPS / HLS / SFU integration
- No stream keys or media credentials issued to clients
- `start` action returns **503 `LIVE_MEDIA_NOT_CONFIGURED`** until a real media adapter is approved and wired
- No claim that any session is operationally LIVE
- No production migration or merge without owner approval

## State machine (server-enforced intent)

```
draft → scheduled | ready | cancelled
scheduled → ready | cancelled
ready → live* | cancelled | failed
live* → ending | interrupted | failed
...
```

\* Transition into `live` is intentionally unreachable from the current API until a media adapter confirms resources.

## How to verify (static)

```bash
node scripts/verify-fresh-live-session-contract.mjs
```

## Next steps (require approval)

1. Review and apply the migration on a non-production Supabase project.
2. Add RLS/behavioral tests against a disposable database.
3. Select and evaluate a free-first media provider; do not activate paid plans without approval.
4. Implement media adapter + real host→viewer path (Phase 2 exit gate).

## Safety posture

- Secret keys stay server-side only.
- Client never receives long-lived stream credentials.
- Discovery only surfaces public, non-draft sessions.
- Private/draft sessions are invisible to non-creators.
