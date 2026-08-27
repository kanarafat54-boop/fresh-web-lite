# Fresh Web Lite — TRUEMODE Feature Wiring Matrix

Status vocabulary: DISCOVERED, WIRED, VERIFIED, BLOCKED. Never mark VERIFIED without runtime evidence.

## Canonical rule

Every user-facing capability must terminate in a real execution path: UI → domain/service → persistence/API/integration → observable result. Existing specialized implementations are retained when they contain domain-specific behavior, but shared primitives should converge on canonical services.

## Audit domains

- Identity / Fresh ID
- Universal shell / navigation
- Fresh Flow / feed
- Shorts / media
- Universal interactions
- Comments / replies / reactions
- Polls / votes
- Saves / reposts / follows
- AI / Fresh Intelligence / context
- Search / knowledge
- Profile / creator
- Live / realtime communication
- Wallet / treasury / payments
- Creator economy
- Marketplace / commerce
- Academy / learning
- Workspaces / organizations
- Moderation / trust / safety
- Notifications
- Accessibility
- Analytics / economic events
- Ara6 / developer platform
- Security / privacy / recovery

## Required verification sequence

1. Inspect existing implementation.
2. Identify canonical owner of the capability.
3. Wire callers to that owner; do not create a competing implementation.
4. Compile/typecheck.
5. Run functional tests where available.
6. Deploy.
7. Verify production/preview runtime.
8. Record evidence and only then mark VERIFIED.

## Current known gates

- Universal interaction persistence: implementation exists; full ecosystem adoption still requires verification.
- Fresh 30-second first experience: deployed successfully; broader product-flow verification remains required.
- Supabase full audit: requires live database access; permission failures must remain BLOCKED rather than guessed around.

## Non-negotiable truth rules

- No fake API success states.
- No fabricated rows or metrics.
- No claiming a feature works because a screen renders.
- No deleting working specialized systems merely to rename them.
- No production verification without actual deployment/runtime evidence.
