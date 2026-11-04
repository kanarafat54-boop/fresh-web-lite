# Fresh Architecture Adoption Map — Preserve, Reconcile, Extend

**Status:** Working architecture reconciliation proposal  
**Purpose:** Adopt the useful work already in the repository instead of replacing it with yet another master document.  
**Scope:** Fresh Web Lite as a universal technology platform / Personal Digital OS. Web is one access surface; it is not the platform boundary.

## 1. Decision

**Do not delete, flatten, or casually supersede existing architecture documents.** The repository already contains valuable doctrine, locked master plans, control-plane and safety architecture, Fresh AI sovereignty and runtime plans, media/Flow designs, communications architecture, design-system rules, operational registers, and feature wiring maps.

This document provides a navigation and reconciliation layer. It is not a replacement for those sources. Existing documents retain their history and domain detail. Where two documents overlap, we must compare them, preserve unique requirements, identify an accountable canonical owner, and link the result before any document is deprecated.

The baseline inventory in `FRESH_PLATFORM_WHOLE_CAPABILITY_BASELINE.md` defines how completion is verified. This document defines how existing architectural knowledge is adopted.

## 2. Architecture authority and document hierarchy

### Tier A — Platform intent and scope

- `FRESH_WEB_LITE_FINAL_MASTER_SPEC.md` — broad ecosystem coverage and locked master product specification.
- `FRESH_WEB_LITE_FINAL_MASTER_ROADMAP.md` — phase order and links to architecture companions.
- `FRESH_WEB_LITE_UNIVERSAL_PLATFORM_DOCTRINE.md` — universal-platform principles, interoperability, user agency, and anti-lock-in intent.
- `FRESH_PLATFORM_POWERS_AND_USER_FLOW.md` — product-facing user value and cross-ecosystem journey.
- `FRESH_BEYOND_SUPERINTELLIGENCE.md` — truth, agency, memory, creation, work, privacy, learning and governance, including explicit non-claims.

**Adoption:** preserve these as the source of product direction and ecosystem breadth. Resolve disagreements in a recorded decision; do not silently rewrite the north star in a newer file.

### Tier B — Platform architecture, policy, safety, operations

- `FRESH_WEB_LITE_PLATFORM_ARCHITECTURE_GOVERNANCE.md` — architecture layers, shared services, data model and governance gates.
- `FRESH_WEB_LITE_PLATFORM_CONTROL_SAFETY_OPERATIONS.md` — control plane, source-of-truth registry, policy engine, trust graph, event/state rules, idempotency, threat modeling, lifecycle, rollout controls and invariants.
- `FRESH_PLATFORM_CONSTITUTION.md` — new baseline principles and maturity gates, currently proposed through PR #96.
- `ENGINEERING_OPERATIONS_EXECUTION_PLAN.md` — operational execution, deployment evidence, rollback and incident controls.
- `PHASE_0_ENGINEERING_RUNBOOK.md` — practical Phase 0 engineering actions.
- `FRESH_RUNTIME_INFRASTRUCTURE.md` and `FRESH_RUNTIME_CAPABILITY_MATRIX.md` — runtime facts, limitations and infrastructure evidence.
- `TRUEMODE-FEATURE-WIRING-MATRIX.md` and `FRESH_POWERS_MISSIONS_MAP.md` — capability-to-code mapping and truth status.

**Adoption:** these should inform the shared platform kernel and the status ledger. The new constitution is a concise principles layer, not permission to discard the more detailed governance companion.

### Tier C — Canonical capability/domain contracts

- **Fresh AI:** `FRESH_AI_CAPABILITY_PRODUCT_CONTRACT.md`, `FRESH_AI_SOVEREIGN_INTELLIGENCE.md`, `FRESH_AI_SOVEREIGN_ROADMAP.md`, `FRESH_AI_UNIVERSAL_POWER_FABRIC.md`, `FRESH_AI_RUNTIME_ROADMAP.md`.
- **Fresh AI training and evidence:** `FRESH_AI_READINESS_AUDIT.md`, `FRESH_AI_COMPLETION.md`, `FRESH_AI_NATIVE_INFERENCE_RUNNER.md`, `FRESH_AI_INDEPENDENCE_ROADMAP.md`, `FRESH_AI_LEARNING_LOOP.md`, `FRESH_AI_CORPUS_V1_ACQUISITION.md`, `FRESH_AI_MULTIMODAL_CORPUS_EXPANSION.md`, `FRESH_AI_USER_DATASET_INTAKE_2026-10-17.md`, `FRESH_AI_IDEA_TO_CAPABILITY_INTAKE.md`.
- **Fresh ID / Mail / communication:** `FRESH_IDENTITY_MAIL_BLUEPRINT.md`, `FRESH_IDENTITY_MAIL_PHASE_0_AUDIT.md`, `FRESH_COMMUNICATION_UNIFIED_ARCHITECTURE.md`, `FRESH_MAIL_BACKEND_SETUP.md`, `FRESH_MAIL_GAP_REGISTER.md`, `FRESH_COMMUNICATION_AND_FLOW_COMPLETION_REGISTER.md`.
- **Flow / media / creator:** `FRESH_FLOW_MEDIA_ARCHITECTURE.md`, `FRESH_FLOW_RUNTIME_FABRIC.md`, `FRESH_FLOW_40_STEP_EXECUTION_PLAN.md`, `FRESH_FLOW_OPERATIONAL_READINESS.md`, `FRESH_FLOW_PRODUCTION_GATE.md`, `SHORTS_FINAL_SPEC.md`, `shorts-functional-contract.md`, `TRUEMODE_VIDEO_CREATION.md`.
- **Compute and runtime:** `FRESH_DISTRIBUTED_COMPUTE_ARCHITECTURE.md`, `FRESH_PLATFORM_RUNTIME_EXPANSION.md`, `FRESH_RUNTIME_INFRASTRUCTURE.md`, `FRESH_RUNTIME_CAPABILITY_MATRIX.md`.
- **Design:** `FRESH_DESIGN_SYSTEM_POINT_ZERO.md`, `FRESH_AI_UI_UX_DESIGN_CONSTITUTION.md`.
- **Knowledge and truth:** `FRESH_INTERNATIONAL_KNOWLEDGE_GRAPH_V1.md`, `TRUEMODE.md`, `FRESH_AI_E2EE_STRATEGY.md`.

**Adoption:** each domain keeps specialized behavior and contracts. The platform integrates domains through shared identity, authorization, capability discovery, event and data contracts, observability, and design primitives; it must not force all domains into one database table or one universal transport.

### Tier D — Dated audits, working plans and implementation records

Dated audits and execution plans remain useful historical evidence. Preserve their date and status. When superseded, add a small status note linking the new evidence rather than deleting the old record. Re-check time-sensitive claims against code, current schema, latest CI, actual provider configuration and deployed commit.

## 3. Reconciliation method for overlapping documents

For every architecture claim or requirement:

1. **Extract** the unique requirement, constraint, assumption, risk, and acceptance test.
2. **Trace** it to implementation, schema/migration, runtime dependency, tests and any production evidence.
3. **Compare** related documents for duplicates, contradictions, different scope, stale dates, or requirements not represented in code.
4. **Assign one owner** for each cross-platform contract while retaining domain-specific contracts where they add real value.
5. **Record the decision**: adopt as canonical, merge unique requirements by linking, keep as domain-specific, mark historical/superseded with a link, or reject with a reason.
6. **Test the resulting contract** and update the status ledger.
7. **Do not delete** a source document as part of reconciliation. Any later archival/removal requires evidence of no unique content and explicit review.

A document labelled “FINAL” or “LOCKED” is strong intent evidence, not proof that every implementation detail remains correct today. A new document is not automatically more authoritative because it is newer. Authority depends on scope, owner, evidence and recorded decisions.

## 4. Platform target beyond a website

Fresh Web Lite is intended to grow as a **device-independent technology platform** with one trusted foundation and multiple runtimes. The browser application is one client. The architecture must be able to support, when implemented and safely verified:

- Web/PWA, Android and desktop clients;
- Fresh ID and user-controlled identity across devices;
- Fresh AI, Ara6, knowledge, memory and governed agents;
- communication, work, learning, creation, media, discovery and commerce;
- local/offline and edge capabilities where device support allows;
- cloud and distributed compute workers behind explicit service contracts;
- hardware/device adapters, including future robotics and physical-world systems;
- APIs and interoperability with external tools, sensors, services and machines.

This is a long-term architecture direction, **not a claim that all these runtimes, robots, models, or physical-world controls exist today**. Every target requires a maturity state and implementation evidence.

## 5. Future robotics and physical-world capability boundary

Robotics should be treated as a future **Physical Systems ecosystem**, not as a webpage button that pretends to control a robot. Design stable interfaces now, but add real adapters only when the hardware, firmware, runtime, test environment, and safety controls are available.

### Proposed layered boundary

1. **Intent and mission:** human goal, environment, constraints, operating zone, success criteria and explicit limits.
2. **World/context model:** only authorized sensor input; timestamps, provenance, uncertainty, calibration and stale-data detection.
3. **Simulation and digital twin:** test plans in simulation before real hardware; compare expected and observed state.
4. **Planner:** task decomposition, reachability/feasibility checks, energy/time limits, no-go zones and hazard analysis.
5. **Policy and authorization:** authenticated operator, per-device capabilities, permission scope, safety envelope and explicit confirmation for consequential operations.
6. **Robot/device adapter:** vendor-neutral capability contract translated to a particular robot, firmware, ROS/ROS 2, industrial protocol, or vendor SDK only when supported and reviewed.
7. **Local safety controller:** hardware emergency stop, collision avoidance, speed/force limits, interlocks and certified controls remain local to the device and cannot be overridden by a cloud AI response.
8. **Execution monitor:** bounded commands, watchdogs, heartbeat, command expiry, idempotency where possible, fault detection and safe stop.
9. **Verification and record:** compare intended versus actual outcome, preserve audit evidence, report uncertainty and require human inspection when needed.
10. **Recovery and governance:** cancel, safe halt, manual takeover, rollback of software/configuration, incident capture and controlled firmware updates.

### Non-negotiable physical-world safety

- No autonomous deployment or robot firmware mutation without owner approval and an appropriate safety process.
- Never treat model-generated text as a low-level actuator command; all commands pass typed schemas, device-specific bounds, authorization and independent safety checks.
- The robot must fail safely if network, context, authorization, localization, sensors, or the planner becomes unreliable.
- Emergency stop and protective systems must not depend on Fresh AI, a remote server, or an internet connection.
- Begin with read-only telemetry and simulation; then controlled lab tests; only then restricted real-world tasks with supervision and a documented hazard assessment.
- No claim of safe or general robot capability without hardware-specific testing and qualified review.

The platform can be designed for future robotics without buying hardware or claiming capabilities that are not yet available. This work does not authorize purchasing equipment or paid infrastructure.

## 6. New cross-cutting architecture to adopt

These are integration rules to apply across the existing documents and code, not a mandate to build every subsystem immediately:

- **Capability registry:** one authoritative description of what a capability does, supported runtime, dependencies, permissions, availability, maturity and test evidence.
- **Identity and policy:** one shared authorization decision path; each service still enforces authorization at its own trusted boundary.
- **Source-of-truth ownership:** each domain identifies the authoritative entity/store and the migration path for legacy duplicates.
- **Event/state contracts:** versioned schemas, correlation IDs, idempotency, bounded retries, deduplication, cancellation, dead-letter/recovery handling and privacy-safe tracing.
- **AI-to-action boundary:** observe permitted state → reason → propose → authorize → execute → verify → record.
- **Hardware boundary:** device capability declaration, signed/authorized command envelope, expiry, local safety, telemetry quality and safe-stop state.
- **Capability maturity ledger:** specified → implemented → contract-tested → integrated → runtime-tested → deployed → production-verified.
- **Artifact portability:** reproducible source snapshot, lockfile, migration history, architecture documents, test commands, environment-variable *names* (never values), checksums, setup guide and known limitations.

## 7. Downloadable, portable project handoff

The project must remain recoverable without depending on this chat. When a release snapshot is ready, prepare a USB-friendly source bundle containing:

- repository source at a named commit SHA;
- all retained architecture and domain documentation;
- migrations, seed/test fixtures and test scripts permitted for distribution;
- lockfile and exact setup/build/test commands;
- `README` with supported environments and offline setup notes;
- a manifest with commit SHA, creation date and SHA-256 checksums;
- a status ledger distinguishing runnable local capabilities from cloud-only or unconfigured dependencies;
- a secret-free `.env.example` containing names and placeholders only;
- licensing/third-party notices and dependency inventory.

**Never include** production secrets, service-role keys, access tokens, private user data, live database dumps, credentials, private datasets without redistribution rights, or model weights that cannot legally be redistributed.

A source ZIP is not the same as a self-contained offline platform: services requiring Supabase, deployed APIs, external providers, GPUs, worker hosts, hardware, or network access remain dependencies. The handoff must say exactly what runs offline and what does not. A final snapshot should be built from a verified commit, checksum-checked, and tested by extracting it into a clean directory. We can prepare an interim snapshot earlier, but it must be labelled **development snapshot—not final complete platform**.

## 8. Immediate adoption sequence

1. Keep the existing architecture sources and add this index as a reconciliation map.
2. Compare master spec, roadmap, governance companions, and operations plan for unique requirements and contradictions.
3. Use the TRUEMODE wiring matrix, powers/mission map, runtime capability matrix, and operational readiness registers as evidence inputs—not as unquestioned truth.
4. Build the first source-of-truth/capability ledger, pointing to exact code, schemas, tests, runtime dependencies and deployment evidence.
5. Reconcile the highest-risk overlap areas first: Fresh ID/authorization, profile visibility, AI capability claims, media job state, interactions, messaging and financial ledger.
6. Add robotics/device interfaces to the long-range architecture without claiming implementation; require simulation and safety gates before any real device integration.
7. Create the portable project snapshot only from a known commit, include all retained documents and checksums, and label the snapshot's actual maturity honestly.

## 9. Definition of success

The architecture work succeeds when the existing useful knowledge is preserved and connected; contradictions and duplicate authorities are visible and resolved deliberately; every capability has one clear contract and verifiable completion criteria; future device/robotics work has a safe integration boundary; and the project can be downloaded, inspected, rebuilt and audited from a known source snapshot without exposing secrets.

**Preserve what is valuable. Reconcile what conflicts. Connect what is isolated. Invent only where there is a real gap. Verify every claim.**
