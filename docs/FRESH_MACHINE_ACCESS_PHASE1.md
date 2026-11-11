# Fresh Machine Access — phase 1 (read-only)

Status: implemented, **not live** until the owner applies `supabase/migrations/20261111100000_fresh_machine_access_core.sql` and issues a credential. Without the migration the gateway answers 503 for authenticated routes; the public manifest still works.

## What exists
- `GET /api/machine/v1/manifest` (public): capabilities, scopes, maturity (`available` vs `planned`), limits.
- `GET /api/machine/v1/shorts` (`shorts:read`): recent public Shorts, respects `unlock_at`, anon-key reads so RLS decides visibility.
- `GET /api/machine/v1/proof/records` and `/proof/verify` (`proof:read`): Fresh Proof records and server-side chain verification.
- Credentials: `fwm_` + 32 random bytes, only the SHA-256 hash stored, expiry required (max 365 days at issue), revocable, per-credential per-minute limit enforced in the database, every authenticated call written to an append-only audit table (no bodies, no tokens).
- Errors never reveal why a token failed (unknown, revoked and expired all look the same).

## What it does not do
- No writes of any kind. Any non-GET answers 405.
- No physical-machine control. Planned capabilities are listed as `planned` and return 404.
- No credential self-service: the owner issues credentials with `scripts/machine-issue-credential.mjs`.

## Function limit
The route is a rewrite to `api/ai/ask.ts` (`__fresh_machine` marker), so the API directory stays at 12 function files.

## Owner steps
1. Review and apply the migration (additive; four new tables, one service-role-only function).
2. Issue a credential: `node --experimental-strip-types --no-warnings scripts/machine-issue-credential.mjs --owner <uuid> --name "..." --purpose "..." --scopes shorts:read,proof:read --days 30`.
3. Call `/api/machine/v1/shorts` with `Authorization: Bearer <token>`.
