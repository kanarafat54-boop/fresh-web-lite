# Fresh Machine Access — Design for Review

Status: **proposal, nothing built.** Builds on `FRESH_PLATFORM_ARCHITECTURE_ADOPTION_AND_EMBODIED_READINESS.md` (sections 4 and 5) and `FRESH_WEB_LITE_UNIVERSAL_PLATFORM_DOCTRINE.md`. It does not replace them.

## 1. The goal, in plain words

Fresh Web Lite should be reachable by **anything that acts without a person at a browser**: scripts and bots, AI agents, partner systems, scheduled jobs, devices and, later, machines and robots. The website becomes **one client** of the platform, not the only door.

I am reading "automatic machines" as: software and hardware that call Fresh by themselves. Please correct me if you mean something narrower or broader. This design does **not** claim Fresh controls robots or physical machines. Section 5 of the embodied-readiness document already sets the rule: physical control comes last, behind a safety boundary, after evidence.

## 2. What exists today (verified in the repository)

- Capability registries exist in code in several places (`src/core/ara6/capabilityRegistry.ts`, the Fresh Flow and Studio registries). They describe what the platform can do. They are **not** exposed to outside callers.
- Authenticated HTTP endpoints exist under `api/` and accept a user's bearer token. There is no credential for a **non-human** caller.
- Supabase already exposes tables through its own API, protected by row security. That is a database API for the web app, not a product API.
- The `api/` directory is **at the Vercel limit of 12 function files**. A machine gateway cannot be a new file; it needs a dispatcher inside an existing function or a consolidation (section 6).

What is missing: a machine identity, scoped and revocable credentials, a public capability manifest, a stable versioned contract, idempotency, rate limits, an audit trail and event delivery to outside systems.

## 3. Design principles

1. **API first.** Anything the web does through a screen must be possible through a documented call. The web app is rebuilt on those same calls over time.
2. **Machines are principals with least privilege.** A machine never acts as the owner. It has its own identity, its own scopes and its own audit trail.
3. **Observe before act.** Follow the maturity ladder in the embodied-readiness document: read first, then propose, then act with approval, then act within bounds.
4. **Every call carries the typed execution envelope** (request id, principal, capability, scope, deadline, idempotency key, result, verification), exactly as section 4.2 of that document describes.
5. **Say what is real.** The manifest lists a capability only at the maturity it has really reached. A listed button or model name is not a capability.

## 4. The pieces

| Piece | What it is | First version |
|---|---|---|
| Machine identity | An account type for non-human callers, owned by a person or organization, with a name, purpose and contact | A `machine_principals` table; owner creates and can disable one |
| Scoped credentials | Long random tokens, shown once, stored only as a hash, with scopes (for example `shorts:read`, `ai:ask`), an expiry and revoke | Prefix + hash; per-token last-used time; rotation by creating a new one |
| Capability manifest | A public, versioned, machine-readable description: capability id, input and output schema, scopes, limits, maturity | Generated from the existing registries, filtered to what is verified |
| Execution envelope | One request/response shape for every machine call | JSON schema, validated at the boundary |
| Idempotency | A key so a retry never repeats an action | Stored per principal; same key returns the same result |
| Limits | Per-credential rate and quota, with clear errors | Simple counters first |
| Audit | Who (which machine and owner) did what, when, with what result | Append-only table; no secrets or payloads that need not be kept |
| Events | Signed webhooks for things a machine subscribes to | At-least-once, retried, with a replay window |
| Adapters | Thin translators for common agent and device protocols (for example an MCP server for AI agents) | After the core exists |

## 5. Phases and what "done" means

| Phase | Scope | Maturity claim allowed when done |
|---|---|---|
| 1. Read-only | Machine identity and tokens, the manifest, a handful of **read** capabilities (public Shorts, search, a creator's public stats), rate limits, audit | "Implemented and contract-tested", then "runtime-tested" after a live trial by the owner |
| 2. Write with limits | Scoped writes (post a Short as a machine account, comment) with idempotency, owner-set quotas and the existing moderation and reporting rules applying | Same ladder |
| 3. Events | Signed webhooks and a pull-based event feed | Same ladder |
| 4. Agent adapters | MCP server and similar thin adapters over the same capabilities | Same ladder |
| 5. Devices | Device enrollment, signed firmware and telemetry, capability discovery for sensors | Only for a **named** device and use case |
| 6. Physical action | Only after a safety case, simulation that is honest about its limits, local emergency stop and independent review | Never implied by software tests alone |

The existing simulation engine returns fixed high scores. The embodied-readiness document already calls that a placeholder, and nothing in this design depends on it.

## 6. Constraint: the 12-function limit (owner decision needed)

Options:

| Option | How | Trade-off |
|---|---|---|
| A. Dispatcher | Route `/api/machine/*` to an existing function, selected by a query marker, as the corrections feature already does | No new files; the host function becomes a mixed bag and must stay well tested |
| B. Consolidate | Merge two lightly used functions to free a slot for a dedicated `api/machine.ts` | Cleaner, but needs careful migration of those two |
| C. Move to a separate service | A small standalone gateway on another host (or Supabase edge functions), fronted by a rewrite | Most scalable; adds a deployment to run and secure |

Recommended: **A for phase 1** (fastest, reversible), and revisit B or C if machine traffic grows.

## 7. Security risks to design against

- **Stolen token:** shown once, hashed at rest, short expiry by default, per-token scopes, one-click revoke, anomaly alerts on use from new places.
- **Over-broad scope:** scopes are specific, default to read, and writes need the owner to opt in per credential.
- **Replay and duplicates:** idempotency keys and a freshness window on signed requests.
- **Abuse and cost:** rate and quota limits per credential; a global kill switch for machine access.
- **Spam and fake content at machine scale:** machine-created content is labelled as such and subject to the same moderation, reporting and blocking as any account.
- **Data exposure:** the manifest and responses never include another person's private data; machines see only what the owning principal could see.
- **Privilege creep:** a machine cannot create other machines or change its own scopes.

## 8. What I need from the owner

1. Confirm the reading of "automatic machines" in section 1, and name the first real caller (for example a partner system, your own scripts or an AI agent) so phase 1 is built against a real need.
2. Choose the function-limit option in section 6.
3. Approve the new tables (`machine_principals`, `machine_credentials`, `machine_audit`). I will write and test the migration on a throwaway database and leave applying it to you.
4. Decide who may create machine accounts at first (only you, or any verified user).

## 9. What I will not claim

Fresh does not currently control machines or robots, and this document does not change that. Phase 1 gives software callers safe, read-only access with a clear contract. Anything physical waits for a specific device, a safety case and your explicit approval.
