# Fresh Platform Architecture Adoption & Embodied-Technology Readiness

**Status:** Architecture reconciliation proposal  
**Date:** 2026-10-19  
**Scope:** The complete Fresh technology platform: digital ecosystems today, future device and embodied systems where justified  
**Companion documents:** `FRESH_WEB_LITE_FINAL_MASTER_ROADMAP.md`, `FRESH_WEB_LITE_FINAL_MASTER_SPEC.md`, `FRESH_WEB_LITE_UNIVERSAL_PLATFORM_DOCTRINE.md`, `FRESH_WEB_LITE_PLATFORM_ARCHITECTURE_GOVERNANCE.md`, `FRESH_WEB_LITE_PLATFORM_CONTROL_SAFETY_OPERATIONS.md`, Fresh AI capability/runtime/sovereign architecture, Ara6 architecture, distributed compute, and runtime capability matrix.

## 1. Decision: preserve, reconcile, implement

Fresh must not restart its architecture by throwing away existing documents or code. It must establish a traceable hierarchy and reuse strong work.

- **Preserve** useful principles, detailed invariants, domain-specific contracts, roadmap coverage, implementation history, and testable requirements.
- **Adopt** the existing master doctrine/spec/roadmap and sections 8–40 architecture-control companions as the principal platform governance baseline, subject to explicit reconciliation of conflicts.
- **Specialize** Fresh AI, Fresh Flow, communication, identity, media, knowledge, finance, Ara6, and other ecosystems under the shared platform contracts; their detailed documents remain authoritative for their own domain where consistent with the master.
- **Reconcile** duplicated, stale, contradictory, or unproven statements in a matrix. Never silently overwrite a conflict.
- **Implement** missing contracts and adapters in reviewable changes, then prove runtime behavior.
- **Retire** a document or implementation only after recording its unique contribution, replacement, migration/compatibility path, and reason. Historical decisions remain discoverable.

The new platform constitution and whole-capability baseline are additive governance documents. They do not automatically supersede the older locked master architecture. If wording conflicts, record the conflict and resolve it explicitly through owner review.

## 2. Document hierarchy and adoption map

| Level | Existing source | Treatment |
|---|---|---|
| 1 — Product north star and coverage | `FRESH_WEB_LITE_FINAL_MASTER_ROADMAP.md`, `FRESH_WEB_LITE_FINAL_MASTER_SPEC.md`, `FRESH_WEB_LITE_UNIVERSAL_PLATFORM_DOCTRINE.md` | Preserve as the strategic source; reconcile duplicate wording and ensure all 28 ecosystem areas remain represented |
| 2 — Platform-wide architecture and governance | `FRESH_WEB_LITE_PLATFORM_ARCHITECTURE_GOVERNANCE.md` sections 8–25 and `FRESH_WEB_LITE_PLATFORM_CONTROL_SAFETY_OPERATIONS.md` sections 26–40 | Adopt as the detailed shared kernel: control plane, source of truth, policy, provenance, execution boundary, events, idempotency, threat modeling, lifecycle, releases, providers, cost, invariants and evidence ledger |
| 3 — Shared execution and capability standards | Fresh AI capability product contract, universal power fabric, runtime roadmaps, runtime capability matrix, distributed compute architecture, Ara6 agent/world/simulation contracts | Adopt as domain-to-platform interfaces; verify every claimed implementation against source and tests |
| 4 — Ecosystem architectures | Fresh Flow media/runtime, Fresh Communication unified architecture, identity/mail blueprints, knowledge graph, TRUEMODE, design constitution, idea-to-capability intake | Preserve domain detail; link each domain to shared identity, policy, data ownership, events, observability and maturity gates |
| 5 — Operational evidence | Engineering runbooks, gap registers, completion registers, migration history, production gates, CI workflows, tests and runtime reports | Use as the evidence layer; dated claims must be refreshed, never copied forward as current truth |
| 6 — Historical/experimental proposals | Older roadmaps, duplicate proposals, experiments and superseded PRs | Retain until their unique value and replacement are reviewed; label historical/experimental when appropriate |

This hierarchy is a proposed consolidation policy, not permission to delete, rewrite or deprecate the existing files without review.

## 3. Canonical platform model

The platform should be organized around shared contracts, not one giant application module or one database table.

```text
Human intent / permitted device or environment signal
                         |
                 Experience adapters
          Web / PWA / Android / Desktop / Accessibility
            Future device / robot / edge adapters
                         |
                  Fresh ID + Consent
                         |
            Shared Policy / Authorization Kernel
                         |
       Platform Control Plane + Capability Registry
                         |
       Fresh AI Intelligence + TRUEMODE / Evidence
                         |
         Ara6 Plans / Tools / Agents / Workflows
                         |
             Typed capability and event contracts
                         |
    +--------------------+--------------------------+
    |                    |                          |
Digital ecosystems   Shared platform services   Physical adapters
Flow / Create /      Search / Knowledge /       Simulators / Sensors /
Communication /      Memory / Files / Events /  Actuators / Robot
Learn / Work /       Jobs / Audit / Observability controllers
Trade / Finance
    |                    |                          |
    +---------- Canonical domain authorities -------+
                         |
             Verification / Audit / Feedback
                         |
             Human control and recovery
```

The diagram is a logical model, not a claim that all these runtime services already exist or are deployed.

### Platform layers and responsibilities

1. **Experience and device adapters:** render usable interfaces and expose only the capabilities actually supported by that runtime, device, permissions and hardware.
2. **Identity and consent:** Fresh ID, sessions, roles, delegation, passkeys, account recovery, user preferences and revocation.
3. **Policy and control plane:** capability registry, policy evaluation, rollout, configuration, health, dependency governance and emergency stop controls.
4. **Intelligence and truth:** Fresh AI request/context pipeline, retrieval, memory governance, model/provider routing, TRUEMODE, evaluation and honest capability status.
5. **Execution and orchestration:** Ara6 plans, tools, jobs, workflows, agents, approvals, idempotency, cancellation, bounded retries and verification.
6. **Shared data and events:** versioned schemas, domain ownership, event contracts, authorized reads/writes, durable state transitions and recovery from partial failure.
7. **Ecosystems and physical adapters:** domain-owned product behavior; future physical capabilities plug in through separately authorized, safety-checked adapters.
8. **Operations and assurance:** CI, migration replay, observability, privacy-safe diagnostics, security response, release gates, rollback and the evidence ledger.

## 4. Canonical contracts to establish before more feature accumulation

These are shared platform contracts to implement or reconcile with existing code. They are not claims that every contract is already present.

### 4.1 Capability registry

Each capability record should define:
- Stable identifier, human-readable purpose, ecosystem and owner.
- Maturity status: specified, implemented, contract-tested, integrated, runtime-tested, deployed, production-verified.
- Input/output schema and version, required permissions and data classification.
- Supported runtimes/devices, required providers/configuration, health and limitations.
- Timeout, cancellation, retry and idempotency behavior.
- Test references, latest verified commit, deployment evidence and rollback/kill switch.

The registry is the authoritative statement of what the platform can offer. A visible button or a model identifier is not evidence of an executable capability.

### 4.2 Typed execution envelope

A common envelope should carry a request/trace identifier, authenticated principal or explicitly delegated agent identity, intent, typed input, requested capability, resource scope, consent/policy context, deadline, idempotency key where relevant, approval record, result/error, provenance, and verification status.

Secrets and unnecessary personal data must not be copied into generic event payloads. Schemas must be versioned and validated at trust boundaries.

### 4.3 Policy decision and approval

Every consequential action must be evaluated against principal, role/delegation, capability, resource, requested operation, data sensitivity, environment, risk and policy version. Decisions should be explicit: allow, deny, require stronger authentication, require additional evidence, require human approval, or allow with restrictions.

Approval is scoped, time-bounded where appropriate, revocable and bound to the action that was reviewed. Changing the target, payload or risk-relevant inputs invalidates approval where necessary. No silent escalation from reading to writing, external communication, financial action, production deployment or physical control.

### 4.4 Source-of-truth and state ownership

Maintain one explicit owner for each critical domain. For example:
- Fresh ID owns identity and authentication state.
- Profile domain owns profile attributes and audience policy.
- Financial ledger owns transaction history and authoritative balances.
- Media storage/job system owns media assets and processing state.
- Knowledge/trust systems own claims, evidence, provenance and truth decisions.
- Governed memory system owns retained AI memory.
- Search and analytics remain derived systems unless an explicit architecture decision states otherwise.

These are target ownership rules; actual schema and code must be mapped before migrations or ownership changes.

### 4.5 Event and job contracts

Use versioned, authenticated, minimally sensitive events for asynchronous work. Define deduplication, ordering assumptions, delivery semantics, dead-letter/recovery behavior, retention, replay authorization, and observability. Long-running jobs need explicit states, progress, cancellation, timeout, resumability, and failure reason. Do not claim exactly-once delivery unless the end-to-end design proves it; prefer at-least-once delivery with idempotent consumers where suitable.

### 4.6 Verification contract

Every execution should distinguish:
- Accepted/requested
- Authorized
- Started
- Completed by provider/runtime
- Output persisted
- Result validated
- User-visible outcome confirmed

A tool returning success is not enough if the output was not persisted or validated. Simulation success is not proof of real-world safety or physical execution.

## 5. Future embodied technology and robotics readiness

Fresh should be designed so that future robots, smart devices, vehicles, assistive systems, industrial equipment, and other physical agents can connect through safe adapters rather than require a separate intelligence and identity foundation. This is a **future compatibility direction**, not a claim that Fresh currently controls robots or has solved general robotics.

### 5.1 What to build into the architecture now

- **Embodiment capability model:** distinguish digital-only capabilities from capabilities requiring sensors, physical effectors, specialized hardware, low-latency control, or a certified controller.
- **Device identity and enrollment:** cryptographic device identity, ownership, provisioning, scoped credentials, rotation/revocation, fleet membership, and secure recovery.
- **Capability discovery:** report sensor/actuator type, ranges, units, calibration, firmware, health, location/privacy scope, permissions and limitations.
- **Sensor abstraction:** typed, timestamped, unit-labelled observations with source, calibration/version, uncertainty, quality and access policy. Preserve provenance; do not silently treat noisy estimates as ground truth.
- **World model and digital twin:** maintain versioned representations of entities, geometry, relationships, environment state, uncertainty and time. Separate observations, estimates, simulated state and verified physical state.
- **Planning and simulation:** represent goals, constraints, collision/operational boundaries, preconditions, resource limits, simulation assumptions and validation results. Simulations must declare what they do not model.
- **Actuator command gateway:** all physical commands pass through a dedicated authorization and safety boundary. Enforce allowlisted actions, range/rate limits, interlocks, deadlines, command freshness, replay protection, watchdogs and safe-stop behavior.
- **Local real-time safety:** safety-critical control loops and emergency stopping must remain local to the device/controller when network latency or cloud availability cannot be trusted. Cloud AI must never be the sole safety mechanism for a time-critical physical hazard.
- **Human supervision:** support teleoperation, explicit approvals for high-risk tasks, clear status, take-over, pause, cancel, emergency stop, and post-action explanation. The user must know whether the system is simulating, proposing, or physically acting.
- **Secure lifecycle:** signed firmware/software, verified boot where supported, staged updates, rollback, vulnerability response, fleet inventory, least privilege, secure logs and physical maintenance procedures.
- **Operational assurance:** test benches, digital-twin/simulator testing, hardware-in-the-loop, controlled field tests, safety cases, incident records and jurisdiction-specific compliance before real deployment.

### 5.2 Physical action maturity ladder

1. **Observe:** read permitted telemetry/sensors only.
2. **Interpret:** create a labelled, uncertainty-aware state estimate.
3. **Simulate:** test a proposed action in a model whose limits are disclosed.
4. **Propose:** show the plan, preconditions, risks and expected outcomes.
5. **Authorize:** check user/operator authority and hardware-specific policy.
6. **Execute in a controlled test environment:** verify interlocks and safe-stop before live field use.
7. **Execute in a limited supervised environment:** bounded tasks, monitored outcomes and immediate stop capability.
8. **Expand only after evidence:** independent validation, operational safety review, incident readiness and explicit release approval.

Not every robot/device should use every step identically; risk analysis and applicable standards determine the required controls. No step is automatically unlocked merely because a software test passes.

### 5.3 Important existing seed to investigate

The current repository has Ara6 agent-runtime code, a basic world-model registry and a simulation engine. The reviewed simulation engine currently returns a successful result with fixed high scores rather than demonstrating a real physics simulation or measured validation. Treat this as a **placeholder/contract gap to fix**, not as robotics capability. Before relying on these modules, add meaningful state models, deterministic test fixtures, evidence-bearing simulation results, explicit assumptions, failure cases and policy-gated execution. Avoid connecting live actuators until those boundaries and safety tests exist.

### 5.4 Future robotics integration boundaries

Potential adapters could include ROS 2 or other device middleware, simulation engines, camera/depth sensors, IMUs, microphones, force/tactile sensors, mobile bases, robot arms, grippers and industrial controllers. These are examples for future evaluation, not dependencies to install blindly. Select them only after a concrete device/use case, supported hardware, license/security review, timing needs and safety requirements are established.

Fresh AI can coordinate perception, planning, explanation and tool selection; it should not replace deterministic low-level control, certified safety systems, hard real-time controllers or trained domain-specific perception/control systems where required.

## 6. Cross-cutting capabilities that make this more than a website

The architecture should accommodate, through shared contracts and separately verified implementations:
- Multimodal intelligence across text, image, audio, video, spatial data and structured signals.
- Personal digital twin/context with explicit scope, freshness, correction, portability and deletion.
- Universal knowledge and evidence graph with time-aware facts, sources, contradictions and multilingual entities.
- Goal-to-outcome orchestration that can span multiple ecosystems and external tools under permission controls.
- Local-first/offline-capable functions where safe, with explicit synchronization and conflict rules.
- Distributed compute across browser, device, edge and cloud without assuming any one vendor or service is always available.
- Accessible voice, touch, keyboard, assistive and future spatial interfaces.
- Interoperable identity/data export and revocable integrations; avoid lock-in.
- Autonomous engineering that can inspect, propose, implement and test, but requires owner approval before consequential merge/deployment.
- Physical/robotic extensions only through the embodiment and safety boundaries above.

These are architecture targets. Each still needs a capability specification, implementation plan, actual dependencies, tests and truthful availability status.

## 7. Document reconciliation procedure

Create a machine-readable or table-based reconciliation register. For each existing architecture document record:
- Path, last known date/status, intended authority and domain.
- Unique requirements worth preserving.
- Overlap with other documents and explicit conflicts.
- Linked implementation files, schemas/migrations, tests and runtime evidence.
- Adoption decision: canonical, domain companion, reference, historical, experimental, or superseded.
- Follow-up owner/action and review state.

Priority reconciliation set:
1. Final Master Roadmap and Final Master Spec.
2. Universal Platform Doctrine.
3. Architecture & Governance (8–25) and Control/Safety/Operations (26–40).
4. Fresh AI product contract, universal power fabric, sovereign architecture and runtime/readiness roadmaps.
5. Ara6 execution/world-model/simulation architecture.
6. Distributed compute and runtime capability matrix.
7. Fresh Flow runtime/media, Fresh Communication, identity/mail and knowledge/TRUEMODE documents.
8. Design constitution, completion registers, gap registers, migration history and engineering runbooks.

A conflict must be resolved by recording the decision and updating affected links/contracts/tests. Do not solve contradictions by deleting one side or treating a newer timestamp as automatic authority.

## 8. Implementation order and exit criteria

### Stage A — Architecture inventory and reconciliation
- Enumerate all architecture/product/operations documents and their links.
- Map shared concepts, unique requirements, contradictions and stale status claims.
- Establish the adoption register and a single index into the retained documents.
- Exit: every critical architecture source has a disposition and its unique contribution is retained.

### Stage B — Runtime truth and dependency map
- Map each critical user-facing capability to code, API, schema/RPC, provider, configuration, authorization, tests and deployment.
- Label UI-only, stub, local-only, adapter-only, contract-tested, integrated and production-verified states.
- Exit: no critical capability is represented as fully working without evidence.

### Stage C — Secure shared kernel
- Stabilize identity, policy, capability registry, source-of-truth ownership, events/jobs, idempotency, observability and migrations.
- Exit: cross-domain authorization and recovery invariants pass integration tests.

### Stage D — Whole user journeys
- Exercise identity → landing → Fresh AI → Flow → profile → communication → create/publish, including refresh, failure and recovery.
- Exit: state remains consistent across actual persistence boundaries and supported devices.

### Stage E — Device/embodiment foundation
- Specify device identity, capability manifest, sensor/world-state schemas, simulation evidence and safety command gateway before any hardware integration.
- Exit: simulator/hardware boundary has tests, fail-safe behavior and human-supervision controls. No production physical actuation without a separate safety case and approval.

### Stage F — Scale and new ecosystems
- Expand media, learning, work, commerce, finance, distributed compute and physical integrations only as each has complete contracts, security, operational controls and proof.
- Exit: new ecosystems reuse shared foundations instead of inventing parallel identity, policy, state and audit systems.

## 9. Non-negotiable acceptance questions

Before declaring any major capability done:
1. What real user or operator outcome can be completed?
2. Which existing architecture document governs it, and what useful prior work is being reused?
3. What is its canonical data owner and state machine?
4. Which identities, permissions, consent and policies are checked at the real boundary?
5. Which dependencies are real, and which are adapters, mocks, or future work?
6. What happens under denied access, timeout, duplicate request, offline operation, partial failure and cancellation?
7. What tests prove the behavior, and on which commit/runtime?
8. Is it usable on supported low-end devices and assistive interfaces?
9. If it affects money, production systems, safety or physical devices, what extra authority and safeguards apply?
10. What evidence supports the exact status we are claiming?

**North star:** Fresh is a coherent, user-controlled technology platform that can grow from digital services into future device and embodied systems without sacrificing truth, safety, privacy, interoperability or human authority. Ambition defines the direction; evidence defines what is currently real.
