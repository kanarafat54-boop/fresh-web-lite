# Fresh Web Lite Platform Constitution

**Status:** Engineering baseline proposal  
**Scope:** The entire Fresh Web Lite technology platform, not only its web interface.

## 1. Platform identity

Fresh Web Lite is a universal AI-native digital platform and Personal Digital Operating System. A browser interface is one access surface, not the platform itself.

**North star:** One identity. One intelligent foundation. Many ecosystems. Open connections. Human control.

The platform connects identity, intelligence, communication, learning, creation, work, knowledge, media, commerce, finance, developer capabilities, automation, and governance. These are cooperating ecosystems on shared foundations—not unrelated demo applications.

## 2. Non-negotiable engineering principles

1. **Architecture before feature accumulation.** Every capability has a documented owner, contract, dependencies, data boundary, failure behavior, and verification method.
2. **Preserve working assets; replace weak foundations deliberately.** “From scratch” means re-establishing the source of truth and repairing or replacing components where needed, not deleting useful working code without evidence.
3. **Security and privacy by design.** Least privilege, explicit authorization, safe defaults, minimal collection, data lifecycle rules, auditability, and user control apply across every ecosystem.
4. **Honest capability states.** Distinguish implemented, contract-tested, integration-tested, device-tested, deployed, and production-verified. A configured model identifier is not proof of trained weights; a UI button is not proof of a working provider.
5. **Shared foundations, modular ecosystems.** Reuse identity, permissions, event contracts, observability, design primitives, and service boundaries instead of duplicating them per feature.
6. **Human control over consequential actions.** AI may observe permitted signals and propose actions; authorization, confirmation, execution, and verification are distinct stages.
7. **Reliable change delivery.** Every change is small enough to review, tested at its actual boundary, and merged only after required checks pass. No blind retries or forced merges to hide failures.
8. **Accessible across real devices and networks.** Design for Android-first constrained devices, desktop, browser, future native runtimes, assistive technology, and unreliable connectivity.
9. **Cost-aware execution.** Prefer free or existing infrastructure until a real requirement justifies paid services. Do not buy domains or provision paid infrastructure without explicit approval.
10. **Open integration without surrendering control.** External services plug into stable contracts and must not silently become the platform's source of truth.

## 3. Reference architecture

### A. Experience and device runtimes
Web/PWA, Android, desktop, accessibility interfaces, and future device adapters. Each adapter exposes only capabilities supported by its operating system, hardware, permissions, and runtime.

### B. Identity and trust
Fresh ID, authentication and recovery, profiles, sessions, passkeys, consent, authorization, roles, privacy preferences, policy enforcement, and security audit.

### C. Platform control plane
Canonical capability registry, configuration and feature flags, policy decisions, service health, dependency/cost governance, migration coordination, rollout controls, and operational diagnostics.

### D. Intelligence and knowledge
Fresh AI routing and model contracts, retrieval, memory with lifecycle controls, knowledge graph, evaluation, provenance, safety, and modality-specific runtimes. The platform must clearly report when a model or modality is not trained, available, or production-approved.

### E. Execution and orchestration
Ara6 and platform workflows follow: observe permitted state → reason → propose → authorize → execute → verify → record. Use idempotency, bounded retries, cancellation, timeouts, and compensating actions where appropriate.

### F. Shared data and event foundation
Explicit schemas, migrations, ownership, authorization at the data boundary, versioned event contracts, idempotent consumers, traceable state transitions, and recovery from partial failure. Do not assume all ecosystems share one table or one database transaction.

### G. Ecosystem services
Communication, Fresh Flow, media, creator tools, Fresh Mail, learning, work, marketplace, wallet/economy, developer services, and future ecosystems. Each uses shared platform contracts while owning its domain logic.

### H. Operations and assurance
CI, type checks, lint, unit/contract/integration tests, migration replay, deployment smoke tests, telemetry, privacy-safe diagnostics, incident handling, rollback, documentation, and a verified status ledger.

## 4. Fresh AI and ambient context

Fresh AI is a platform intelligence capability, not merely a chat widget. It may combine user-provided content, authorized platform state, explicit device capabilities, and opt-in interaction signals.

Interaction awareness must be scoped to the active runtime and consent. Touch, pointer, hover, focus, and accessibility signals can inform assistance only where available. No covert global tracking, inferred identity from cursor habits, or unsupported claims about emotions or thoughts. Proximity and biometric access require explicit OS/hardware support and permission. Authentication must use trusted Fresh ID mechanisms.

Live inference, stored conversation protection, training readiness, and production approval are separate controls and must be described accurately.

## 5. Delivery and maturity gates

For each capability, track these states independently:

1. **Specified** — user outcome, constraints, owner, and threat model defined.
2. **Implemented** — code exists on a reviewable branch.
3. **Contract-tested** — automated tests cover required invariants.
4. **Integrated** — actual dependencies, authorization, persistence, and error paths verified.
5. **Runtime-tested** — relevant browser/device/service scenarios verified.
6. **Deployed** — target environment reports a successful deployment.
7. **Production-verified** — real user journey and operational health confirmed.

A green build alone does not imply production readiness. A preview deployment does not imply the production domain has changed.

## 6. Failure-handling standard

When an action fails, capture the exact action, run/commit, failed step, diagnostic output, root cause, corrective change, and rerun result. Separate infrastructure/provider failures from code/test failures. Avoid repeated blind retries, hidden failures, or merging to bypass required checks. Keep user-facing progress concise and truthful.

## 7. Foundation-first sequence

### Phase 0 — Establish the source of truth
Inventory existing code, open pull requests, data migrations, environment dependencies, workflows, and production claims. Map duplicates, missing boundaries, unsafe defaults, and stale branches. Record what is implemented, tested, deployed, and verified.

### Phase 1 — Secure platform kernel
Stabilize Fresh ID, authorization/policy contracts, configuration, capability registry, audit-safe diagnostics, data ownership, migration discipline, and CI reliability.

### Phase 2 — Connect the core journey
Verify identity → home/landing → Fresh AI → Fresh Flow → profile → communication → creation/publishing as real end-to-end flows, not isolated screens.

### Phase 3 — Make ecosystems dependable
Complete account settings, messaging, Fresh Mail, creator/media flows, and other services against real provider and persistence boundaries. Do not label unavailable provider-dependent capabilities as complete.

### Phase 4 — Intelligence and execution
Integrate evaluated Fresh AI serving, retrieval and memory controls, opt-in interaction awareness, and Ara6 execution with policy checks and verification.

### Phase 5 — Economy, interoperability, and scale
Only after core authorization, ledger integrity, service reliability, and operational controls are verified, expand commerce, wallet, creator settlement, APIs, and broader ecosystem integrations.

Security, accessibility, cost discipline, quality, documentation, and user control are continuous requirements across every phase.

## 8. Immediate engineering rule

Do not add a new ecosystem merely because its UI can be built. First identify the platform contract it uses, the real capability behind it, the authorization and data boundary, its failure behavior, and the test proving it works. Where the current architecture cannot support a capability safely, fix the foundation before adding more surface area.
