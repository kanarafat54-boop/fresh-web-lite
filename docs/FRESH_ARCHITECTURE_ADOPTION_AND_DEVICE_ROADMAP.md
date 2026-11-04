# Fresh Platform — Architecture Adoption, Capability Verification, and Device Roadmap

**Status:** Proposed integration plan; not a claim that every capability is implemented.
**Scope:** Fresh Web Lite as a cross-device technology platform and Personal Digital Operating System, not merely a website.
**Rule:** Preserve existing architecture documents and code. Consolidate through traceable links and verified contracts; do not delete or rewrite useful material just to reduce document count.

## 1. North star

Fresh should provide one coherent platform across web, mobile, desktop, offline-capable devices, AI-assisted workflows, media, knowledge, identity, and—only when safely implemented—physical devices and robotics. The interface should stay simple while the underlying system uses explicit capability boundaries, permissions, auditability, and replaceable infrastructure.

A future robot/device integration is a direction, not a present capability. Browser code must not be treated as a hardware controller. Physical-device control requires a separate trusted device gateway, explicit pairing and authorization, bounded commands, emergency-stop/fail-safe behavior, telemetry, simulation and hardware-in-the-loop testing, and human confirmation for consequential actions.

## 2. Existing architecture to preserve and connect

| Existing source | Keep and use for | Integration requirement |
|---|---|---|
| docs/FRESH_WEB_LITE_PLATFORM_ARCHITECTURE_GOVERNANCE.md and its Control/Safety/Operations companion | Platform layers, canonical data, security, trust, operations and definition of done | Treat as governance reference; link implementations and tests to the relevant invariants |
| docs/FRESH_DISTRIBUTED_COMPUTE_ARCHITECTURE.md | Browser/edge/worker compute, event fabric, durable media jobs and adapter boundaries | Map each capability to its actual implementation and mark adapter-only or proposed components honestly |
| docs/FRESH_FLOW_MEDIA_ARCHITECTURE.md | Fresh Flow media worlds and contextual UX | Verify each world’s route, interaction, persistence and failure behavior end to end |
| docs/FRESH_AI_MULTIMODAL_CORPUS_EXPANSION.md, docs/FRESH_AI_NATIVE_INFERENCE_RUNNER.md, and training/README.md | Authorized data, Fresh-owned tokenizer/model, checkpoint integrity, evaluation and promotion | Keep training data import, tokenizer training, model training, inference, and production promotion as separate states |
| src/core/fresh-ai/FreshAIArchitecture.ts and existing Fresh AI contracts | Capability/agent vocabulary and canonical AI boundary | Wire capabilities to real tools and evidence; do not equate declared capability names with working behavior |
| Existing Fresh ID, TRUEMODE, privacy, migration and build-gate contracts | Identity, permissions, provenance, security and regression protection | Preserve fail-closed behavior; verify against current schema and real authenticated flows |

This is a seed map, not a complete repository inventory. The follow-up inventory must enumerate all architecture and roadmap documents, implementation entry points, tests, migrations, workflows, and deployed routes before marking anything redundant.

## 3. Architecture-document disposition rules

Every architecture or roadmap document must receive one explicit disposition:

- **Canonical:** authoritative contract for a bounded domain.
- **Companion:** valuable detail linked from a canonical source.
- **Implementation guide:** operational instructions that point to code and tests.
- **Historical:** retained for provenance, clearly labelled superseded where applicable.
- **Candidate to consolidate:** duplicate or conflicting content, with exact replacement links and owner approval before any removal.

Do not delete documents during the inventory pass. Record each document’s purpose, status/date, owning domain, implementation paths, tests, conflicts, dependencies, and disposition. Resolve contradictions by a documented decision and migration path, not silent rewriting.

## 4. Capability registry and honest maturity states

Each user-visible capability should have a stable ID, owner, entry point, required permissions, dependencies, data boundary, implementation evidence, tests, failure/recovery behavior, and maturity status. Use these states consistently:

1. **Proposed** — design only.
2. **Contracted** — interfaces and acceptance criteria exist.
3. **Implemented** — code exists.
4. **Automated-tested** — relevant tests pass.
5. **Integration-verified** — real connected dependencies and authenticated paths pass.
6. **Production-verified** — deployed exact revision is checked in the intended environment.
7. **Operationally-monitored** — telemetry, alerts, rollback and recovery are in place.

A green build is evidence for the checks it ran, not proof that all features work. A stored training example is not a trained model; a generated run record is not a checkpoint; an architecture map is not a deployed service.

## 5. End-to-end verification before expansion

For each priority journey, trace the whole path:

**UI action → identity/permission check → domain contract → provider/worker → durable state → returned result → UI state → audit/telemetry → recovery path.**

Initial verification order:
1. Fresh ID sign-up/login/recovery and correct landing route.
2. Supabase migration history/schema reconciliation and row-level security on real test identities.
3. Fresh AI chat, voice, tool invocation, research source persistence, file handling, and truthful unsupported-provider errors.
4. Fresh Flow media selection, playback, save/history and account/privacy boundaries.
5. Build-gate/Actions failures, preview checks, production smoke tests, and rollback evidence.

Record pass/fail/blocked separately. Do not claim a path passed when only static contract tests or an older preview were checked.

## 6. Device and robotics-ready evolution

Build in stages without pretending the web app itself is a robot controller:

- **Stage A — Portable platform:** responsive web/PWA, explicit browser capabilities, accessibility, offline-safe read/work queues, export/backup, and documented restore.
- **Stage B — Local device runtime:** optional signed desktop/mobile companion with a narrow permissioned API; local inference only where hardware and model licenses permit.
- **Stage C — Device gateway:** authenticated device registry, pairing/revocation, command schemas, least privilege, telemetry, rate limits, replay protection, audit logs and secure update process.
- **Stage D — Simulation first:** virtual devices, deterministic scenarios, fault injection, geofencing where relevant, collision/safety constraints, watchdogs, and emergency stop.
- **Stage E — Controlled physical pilots:** human-supervised testing with independent safety review, hardware interlocks, safe failure states and documented incident response.
- **Stage F — Broader ecosystem:** interoperable adapters for approved robots/sensors/actuators, never direct unreviewed model output to hazardous actuation.

No physical-device action may be enabled by a general chat response alone. Device actions require structured policy-checked commands and confirmation proportional to risk. Loss of network or AI availability must not disable local emergency stops or hardware safety controls.

## 7. Downloadable, reproducible release bundle

Create a versioned source archive from a verified Git commit/tag for copying to USB. Include source, architecture docs, licenses/notices, setup instructions, test commands, a manifest with commit and SHA-256, and a list of required environment variables by name only. Exclude secrets, .env values, credentials, private datasets, live user records, generated caches, node_modules, and unapproved model weights.

The bundle must state what it can run offline and what requires hosted services. A source archive is not automatically an installable Android APK, a trained model, or a self-contained production environment. Generate release assets only after the chosen commit passes its declared gates; verify the archive hash and test extraction before sharing it.

## 8. Acceptance criteria for this plan

- Existing useful architecture documents remain present and linked; no blanket deletion.
- A repository-wide inventory is completed before consolidation.
- Capability status is backed by tests or explicit evidence links.
- Critical user journeys have separate automated, integration, and production verification results.
- Device/robotics work remains staged behind safety and hardware-specific gates.
- A reproducible, secret-free release archive can be built from a pinned commit and verified by SHA-256.
- Unimplemented or blocked items remain visibly marked; no success claims based on plans alone.

## 9. Immediate next deliverables

1. Complete the architecture/document/code/test inventory.
2. Build a capability-to-route/API/database/provider/test matrix, starting with Fresh ID, Fresh AI and Fresh Flow.
3. Resolve migration and workflow blockers before broad feature expansion.
4. Add or repair end-to-end tests for the highest-priority journeys.
5. Produce a verified source bundle and USB restore guide from a passing commit.