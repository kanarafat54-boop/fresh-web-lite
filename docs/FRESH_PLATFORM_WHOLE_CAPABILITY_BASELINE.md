# Fresh Web Lite Whole-Capability Baseline Inventory

**Snapshot date:** 2026-10-19  
**Purpose:** Stop treating the existence of a feature folder, screen, contract, or passing build as proof that the promised capability is complete.

This is an initial evidence-based inventory, not a certification that every runtime path has been exercised. The repository tree and existing contracts show substantial work across many domains, but code presence and contract tests alone cannot prove that user outcomes work end to end.

## 1. Product-level acceptance rule

A capability is not complete merely because its UI exists or its test checks for a string. For every user-visible promise, the team must identify and verify:

1. **Outcome:** the real task the user can finish, stated in plain language.
2. **Journey:** entry point, prerequisites, normal path, success result, exit/back path, and continuation.
3. **Domain contract:** source of truth, data ownership, state transitions, idempotency, and version compatibility.
4. **Dependencies:** identity, authorization, policy, provider/service, storage, network, device capability, and configuration.
5. **Safety and trust:** authentication, authorization at the server/data boundary, consent, privacy defaults, abuse cases, audit trail, and deletion/export where applicable.
6. **Failure and recovery:** loading, empty, offline, timeout, rate limit, permission denial, duplicate action, partial success, retry, cancellation, recovery, and rollback.
7. **Accessibility and usability:** small Android screens, touch targets, readable content, keyboard/screen-reader use, localization-ready copy, and low-bandwidth behavior.
8. **Integration:** adjacent features and shared platform services work together; no dead buttons, fake data, disconnected state, or UI-only completion.
9. **Verification:** tests prove behavior at the relevant boundary; a browser/device journey is exercised; deployment and production status are recorded separately.
10. **Honest status:** specified, implemented, contract-tested, integrated, runtime-tested, deployed, and production-verified are separate states.

Any unmet item is an explicit gap, not something silently assumed complete.

## 2. Repository baseline observed

The current `main` tree has approximately 1,029 entries. It includes a broad Fresh AI core, Fresh ID experience, many verification scripts, more than 100 dated SQL migrations, and multiple CI workflows. This breadth is useful, but it creates a high risk of duplicate concepts, overlapping migrations, contract-only tests, and names that imply more runtime readiness than has been demonstrated.

### Existing evidence anchors

- **Fresh AI:** capability registry/runtime, provider routing, platform runtime, workspace context, memory/knowledge, training pipeline, model inference/training and modality-related modules; numerous contract scripts exist.
- **Identity and security:** Fresh ID authentication surfaces and security contract tests; passkey compatibility and signup/recovery changes are in open pull requests.
- **Fresh Flow and social:** flow-fabric contract, profile foundation, connections/messages, universal interaction persistence, feed ranking and privacy-oriented changes.
- **Media and creation:** media runtime, publishing bridge, worker contracts, Shorts gates, Studio/creator handoffs, and production-boundary documentation.
- **Communication:** Fresh Mail contract and backend gate.
- **Platform assurance:** build gate, AI integrity, training contracts, Shorts production gate, TRUEMODE chain verification, migration replay and Phase 0 PostgreSQL security workflows.
- **Architecture documentation:** platform constitution proposal, powers/user-flow map, runtime expansion notes, and ecosystem architecture checks.

**Interpretation limit:** These are repository assets and automated checks. Their existence does not establish that each feature is fully connected, works against live services, is usable on a real device, or is production-verified.

## 3. Current open change set: integration risk

At the time of this snapshot, pull requests #92–#96 are open draft proposals targeting `main`. They should not be assumed to be part of production. Their changes overlap the platform baseline in different ways:

| PR | Scope | Evidence to require before merge |
|---|---|---|
| [#92](https://github.com/kanarafat54-boop/fresh-web-lite/pull/92) | Fresh ID signup, recovery and private profile fields | Required CI green; real auth-flow checks for confirmation, duplicate username, password mismatch, session restoration, private metadata lifecycle, and landing destination |
| [#93](https://github.com/kanarafat54-boop/fresh-web-lite/pull/93) | Protofile/Flow privacy boundaries | Required CI green; isolated full migration replay; prove visibility/accepted-connection rules against actual schema and authorization boundaries |
| [#94](https://github.com/kanarafat54-boop/fresh-web-lite/pull/94) | Passkey/browser compatibility | Required CI green; supported-browser/device behavior and safe password fallback; no claim that every device has passkeys |
| [#95](https://github.com/kanarafat54-boop/fresh-web-lite/pull/95) | Opt-in ambient interaction signals | Required CI green; explicit consent/settings and proof of downstream AI integration before claiming adaptive assistance is live |
| [#96](https://github.com/kanarafat54-boop/fresh-web-lite/pull/96) | Platform constitution and foundation-first rules | Required CI green; treat as a policy baseline, not an implementation of every architecture layer |

At the snapshot, the latest observed head of PR #96 was `6a9485db44e1b19ffc8de3801b078fdebea4b7ae`; its Fresh Web Lite build gate, Fresh AI integrity, training-contract, Fresh Mail backend, Shorts production, and TRUEMODE chain checks reported success. This statement applies to those observed runs and commit only; deployment status and other PR heads must be checked again at merge time. PR #94's corrected head `1566bbe9270b9b6ea78877d24ebe283c4e315c98` also had those named checks succeeding in the observed run set. This inventory does not certify #92 or #93 end-to-end behavior.

## 4. Capability inventory: what must be audited

The groups below are the required audit domains, not a declaration that every capability already exists.

| Domain | Complete user outcome | Required supporting systems and edge cases |
|---|---|---|
| Fresh ID and identity | Person can safely register, verify, sign in, recover, manage sessions and leave | Duplicate identity, verification expiry, recovery abuse, passkey unsupported, account lockout, private metadata lifecycle, session revocation, accessibility |
| Platform control plane | Platform has one authoritative answer for capability state and policy | Registry ownership, versioning, feature flags, dependency health, authorization, cost limits, audit-safe diagnostics, rollback |
| Fresh AI | User receives useful grounded assistance and can safely act on it | Provider selection, context consent, retrieval, memory lifecycle, capability honesty, cancellation, timeouts, tool authorization, prompt-injection boundaries, feedback and evaluation |
| Ara6 / automation | Authorized intent can become a controlled, verified outcome | Plan preview, policy check, approval, idempotency, bounded retries, cancellation, partial failure compensation, execution log |
| Fresh Flow / social | User can discover, publish, connect, converse, control audience and manage content | Feed modes, ranking explanations, visibility, blocks/reports, accepted connections, comments/reactions, media lifecycle, deletion/export, moderation and appeals |
| Creation / Studio / media | User can create, edit, save, publish and revisit work reliably | Draft persistence, upload progress/resume, codecs, device limits, worker availability, preview/render parity, captions, accessibility, rights/safety checks, publish failure recovery |
| Communication / Fresh Mail | User can send, receive, find and manage messages | Delivery states, unread state, attachments, spam/abuse controls, privacy, search, sync/offline behavior, retry/deduplication, account recovery |
| Knowledge / search / TRUEMODE | User can find evidence-backed information and inspect provenance | Source quality, stale data, claim/source links, conflict handling, persisted evidence, authorization, deletion/retention, empty/error states |
| Learning / work / productivity | User can complete a task or learning goal across sessions | Progress persistence, drafts, files, collaboration, permissions, resumability, export, notifications and interrupted-work recovery |
| Marketplace / commerce | User can discover and transact with transparent terms | Seller identity, listing truth, order lifecycle, refund/dispute handling, fraud controls, availability, consent and audit |
| Wallet / Fresh Currency / Treasury | User can understand balances and complete valid ledger actions | Server-authoritative ledger, transaction atomicity, concurrency, ownership, idempotency keys, recipient resolution, reversals, reconciliation and fraud controls; ledger is not itself a payment processor |
| Profile / Protofile | User controls identity presentation and audience | Field-level visibility, private defaults, accepted-connection checks, data minimization, owner-only settings, safe analytics and media permissions |
| Device runtimes / accessibility | Same purpose remains usable across supported devices | Responsive layout, touch/keyboard/screen-reader support, permission capability checks, install/update path, low-memory and slow-network handling |
| Governance / operations | Failures are diagnosable and changes safely reversible | Runbook, health signals, privacy-safe logs, CI gates, migration replay, deployment verification, rollback, incident response and capability status ledger |

## 5. Known evidence gaps to close

These are verification tasks identified from the existing architecture and project history. They must be checked against the current implementation before being marked resolved.

- **End-to-end product journey:** demonstrate Fresh ID → landing/home → Fresh AI → Fresh Flow → profile → communication → creation/publishing using real persisted state and real authorization.
- **Source-of-truth map:** assign one authoritative owner for identity, capability availability, policy, profile visibility, interactions, AI provenance, media jobs, messages, and financial ledger state. Document legacy mirrors and migration/deprecation paths.
- **Feature dependency map:** map each user-facing action to the frontend, API/service, schema/RPC, provider, environment/configuration, authorization check, tests, and production deployment.
- **Migration reliability:** replay the complete migration chain from a clean supported PostgreSQL environment, validate required objects before policies reference them, and distinguish clean-install from upgrade-path results.
- **Auth real-flow proof:** test email verification, recovery, duplicate identity/username, mismatch validation, restored sessions, sign-out/revocation, and private profile metadata lifecycle.
- **AI capability truth:** prove which provider and model each route actually calls, which context is used, what is stored, and what is explicitly unavailable. Training pipeline smoke evidence is not proof of a trained production model.
- **Provider boundaries:** identify each feature that still uses an adapter, stub, local-only persistence, mock data, or unavailable external service. Display honest UI states rather than silently simulating success.
- **Cross-feature state:** prove that create/publish, save, react, connect, message, profile visibility, search and notification state agree across screens and refreshes.
- **Runtime/device coverage:** exercise constrained Android, small viewport, denied permissions, offline/slow network, stale session and interrupted uploads/actions.
- **Operational failure loop:** each red action should be tied to exact workflow/run/commit/failed step/root cause/fix/rerun. Avoid blind retries and do not use unrelated green checks to imply all checks passed.
- **Production verification:** test the deployed domain independently from branch previews and confirm the deployed commit. A successful preview or build is not production proof.

## 6. The evidence ledger every capability must have

For each capability, create or maintain one row with these fields:

- Capability and user outcome
- Product owner / code owner
- Source-of-truth domain and schema
- Entry points and complete user journey
- Required dependencies and supported environments
- Authorization, consent and privacy rules
- Normal-state and failure-state behavior
- Unit/contract/integration/migration/runtime test references
- Latest verified commit and CI run links
- Preview deployment result, if applicable
- Production deployment commit and end-to-end verification evidence
- Known gaps, severity, next action and rollback path
- Status: **specified / implemented / contract-tested / integrated / runtime-tested / deployed / production-verified**

No one status may be inferred from another.

## 7. Prioritized execution order

1. **Inventory and truth ledger:** connect every critical user-facing capability to code, schema, dependency, tests, and deployment evidence.
2. **Secure kernel:** identity, policy/authorization, source-of-truth registry, privacy boundaries, audit-safe diagnostics and migration discipline.
3. **Core end-to-end journey:** make the most important daily flows real, persisted, recoverable, and connected.
4. **Provider-dependent capabilities:** replace adapters or clearly mark unavailable functionality; validate real service behavior.
5. **Cross-ecosystem integration:** make profile, Flow, communication, AI, creation and search agree on shared identity and state.
6. **Runtime and production proof:** device/network matrix, operational runbooks, deployment commit verification and real user journeys.
7. **Only then expand surface area:** new capabilities must meet the same completeness standard from their first implementation.

## 8. Definition of done

A capability may be called **complete** only when its promised outcome works end to end in its declared supported environments; critical security, privacy, accessibility, normal and failure paths are verified; relevant dependencies and persistence are real; required checks pass on the exact candidate commit; and deployment/production claims match evidence.

If some elements are unavailable, the capability can still be delivered incrementally, but its UI and status must clearly distinguish what works now from what remains. The objective is not to make the inventory look green. The objective is to make the platform truthful, dependable, and genuinely useful.
