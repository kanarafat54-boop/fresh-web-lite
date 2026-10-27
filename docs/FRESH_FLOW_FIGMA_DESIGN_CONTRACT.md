# Fresh Flow Figma Design ↔ Implementation Contract

**Design file:** https://www.figma.com/design/b2kC0RCJAUxS7jLda1lAvB
**Repository:** https://github.com/kanarafat54-boop/fresh-web-lite
**Architecture baseline:** PR #153 — https://github.com/kanarafat54-boop/fresh-web-lite/pull/153
**Design status:** Editable wireframes created; visual review and true in-file prototype transitions remain pending.

## Figma pages and screens

The Figma Starter workspace permits three pages, so screens are grouped into three page families rather than a separate page for every subsystem.

### 01 — Media, Design System & Accessibility
- 3:9 — Discover everything (mobile 390×844)
- 3:66 — Playback, your way (mobile 390×844)
- 3:116 — Live universe (mobile 390×844)
- 3:191 — Live room · host & audience (mobile 390×844)
- 11:6 — Fresh Flow / Button component set; Primary and Secondary variants
- 11:7 — Design-system and accessibility foundation panel
- VariableCollectionId:3:2 — Fresh Flow / Core Tokens
- Core token IDs: VariableID:3:3 Canvas, VariableID:3:4 Surface, VariableID:3:5 Accent, VariableID:3:6 Text, VariableID:3:7 Muted, VariableID:3:8 Border

### 02 — Creator Studio & Personal Identity
- 6:2 — Creator studio (mobile 390×844)
- 6:53 — Identity & workspaces (mobile 390×844)
- 6:111 — Creator dashboard (mobile 390×844)

### 03 — Developer, Admin, AI & Monetization
- 8:2 — Developer console (responsive dashboard, 1200×760)
- 8:51 — Admin operations (responsive dashboard, 1200×760)
- 8:92 — Fresh AI assistant (mobile 390×844)
- 8:122 — Creator monetization (mobile 390×844)

Node IDs make design review references unambiguous. Screens are composed from editable text, frames and auto-layout layers rather than flattened screenshots.

## Implementation contract mapping

| Design area | Contract surface | Required implementation evidence |
|---|---|---|
| Discovery and playback | Extensible media capability registry; existing Fresh Flow media workspace/runtime | Capability descriptor, real source data, format renderer, loading/empty/error/retry states, playback and interaction tests |
| Live universe and room | Live provider adapter, session lifecycle, device permission and safety contracts | Actual provider/protocol, create/join/host/viewer flows, reconnect behavior, captions, moderation and provider contract tests |
| Creator studio | Upload orchestration, media processing jobs, drafts, publishing | Persisted asset/job state, resumable upload, processing status, publish authorization and end-to-end verification |
| Personal identity/workspaces | Fresh ID, profile ownership, workspace memberships and role-based API authorization | RLS and server authorization tests for owner/member/other-user/privileged roles |
| Creator dashboard | Creator assets, publication, analytics, monetization eligibility and ledger | Authorized persisted metrics; no mock balances or fabricated earnings |
| Developer console | Projects, environments, scoped credentials, quotas, webhook delivery and redacted logs | Secret hashing/rotation/revocation, scoped permissions, environment isolation, audit and rate-limit tests |
| Admin operations | Moderation, appeals, provider health and privileged audit | Least privilege, case-scoped access, mandatory reasons, audit trail and role enforcement |
| Fresh AI assistant | Permissioned assistant tools and media-context APIs | Tool authorization, explicit confirmations for sensitive actions, cancellation/undo where possible, error states |
| Monetization | Offers, eligibility, provider/country support, ledger, refunds and payouts | Real provider or auditable ledger evidence, transparent fees, idempotency and reconciliation |

## Shared acceptance requirements

- Mobile-first layouts must remain usable on small Android screens and weak connections.
- Target WCAG 2.2 AA: readable scalable text, sufficient contrast, accessible names, keyboard/focus order, captions/transcripts, alt text, reduced-motion support, localization and RTL readiness.
- Show loading, empty, offline, denied-permission, unsupported-format/device, validation, upload/processing failure, retry and server-error states.
- Personal identity, creator workspace, developer workspace and administrative role are separate security contexts. Privileged roles are server-assigned, not user-editable profile flags.
- TLS and managed at-rest encryption are baseline safeguards. Do not label a feature end-to-end encrypted without a real protocol, key lifecycle and verification.
- Monetization amounts are estimates until supported by an auditable transaction/ledger; settled, pending, refunded and chargeback states must be distinct.
- Prototype controls are not evidence of working product behavior. Every capability remains Proposed, Implemented—verify, Partial, Provider/device required, or Verified until actual implementation and release evidence justify a stronger status.

## Prototype limitation and next design pass

The initial screens are editable wireframes and the live-session CTA has a URL action that opens the destination frame. The current Figma MCP action schema did not accept a native node-to-node prototype transition, and the Starter-plan Figma MCP call limit was reached before the contract hub and remaining prototype interactions could be added. Do not call the file a fully linked interactive prototype yet. Next design pass: add native in-file transitions, connect the remaining primary actions, then review full-screen screenshots and responsive behavior.

## Source links

- Whole-media execution board: https://github.com/kanarafat54-boop/fresh-web-lite/blob/plan/fresh-flow-whole-media-platform/docs/FRESH_FLOW_PARALLEL_EXECUTION_BOARD.md
- Extensible capability registry: https://github.com/kanarafat54-boop/fresh-web-lite/blob/plan/fresh-flow-whole-media-platform/src/features/fresh-flow/core/freshFlowCapabilityRegistry.ts
- Capability registry contract test: https://github.com/kanarafat54-boop/fresh-web-lite/blob/plan/fresh-flow-whole-media-platform/scripts/verify-fresh-flow-capability-registry.mjs
- Review PR #153: https://github.com/kanarafat54-boop/fresh-web-lite/pull/153
