# ARA6 — Master Architecture & Evidence-Based Roadmap

**Status:** Foundational architecture proposal  
**Repository baseline:** `main` at the time this document was prepared  
**Implementation branch:** `docs/ara6-master-architecture`  
**Owner decision:** Ara6 is intended to become both the parent technology company and an independent technology platform.  
**North star:** Build foundational technologies for software, intelligence, computing and machines.  
**Guiding principle:** Technology Without Boundaries (working tagline; not a registered or final brand decision).

> This document distinguishes verified repository capabilities from future goals. A roadmap item is not an implemented feature, and an ambition is not a capability claim.

## 1. Purpose and identity

Ara6 is the proposed independent technology company and platform behind a family of products and foundational technologies. It must not be defined only as a wrapper around Fresh AI or Fresh Web Lite.

Ara6's long-term remit is to research, design and build:
- programming languages, compilers, runtimes and developer tooling;
- AI systems, reasoning, learning, evaluation and model infrastructure;
- computing systems, distributed execution and resource orchestration;
- robotics, automation, perception and machine-control systems;
- products and services that apply these technologies to real users and industries.

Fresh AI is a major intelligence research and product programme within this wider direction. Fresh Web Lite is an important product ecosystem and an early integration environment. Neither alone defines the full Ara6 mission.

## 2. Company and platform structure

The following is a strategic target structure, not a statement that a company has been legally incorporated or that all divisions currently exist.

### ARA6 — Parent company

Responsible for company governance, intellectual property strategy, capital allocation, security, legal/compliance oversight, research priorities and product portfolio.

### Technology divisions

1. **Ara6 Language & Runtime**
   - Language specification and reference implementation
   - Lexer, parser, AST, type system and diagnostics
   - Compiler/interpreter and bytecode or native execution strategy
   - Standard library, package manager, debugger, formatter and test tooling
   - Sandboxed execution, permissions and resource limits

2. **Ara6 Intelligence**
   - Fresh AI and future Ara6 intelligence systems
   - Reasoning, memory, learning, perception and planning
   - Data governance, training pipelines, model registry and evaluation
   - Inference runtime, tool orchestration and measurable capability benchmarks

3. **Ara6 Computing**
   - Workload scheduling and distributed execution
   - CPU/GPU/accelerator abstraction and cost-aware resource selection
   - Storage, networking, observability and fault tolerance
   - Future processor and hardware research, only when justified by capability and funding

4. **Ara6 Robotics**
   - Simulation-first robotics research
   - Perception, localization, planning and control
   - Safety interlocks, human supervision and hardware abstraction
   - Physical deployment only after simulation, safety and reliability gates pass

5. **Ara6 Systems & Products**
   - Shared identity, trust, security, developer and operational foundations
   - Fresh Web Lite and its connected ecosystem products
   - Product engineering, user experience, distribution and customer support

Research and engineering functions should serve all divisions rather than create disconnected silos.

## 3. Current repository baseline — verified

The following files were inspected on the repository's `main` branch while preparing this document:

| Area | Existing implementation | Evidence-based assessment |
|---|---|---|
| Task engine | `src/core/ara6/engine.ts` | In-memory task list with create/start/complete/fail operations; not a durable scheduler or distributed execution engine. |
| Tool registry | `src/core/ara6/toolRegistry.ts` | Registers handlers and supports approval checks, timeout/cancellation, retries and completed-result idempotency. In-memory state; requires further resilience and security review. |
| Capability registry | `src/core/ara6/capabilityRegistry.ts` | In-memory capability catalogue linking tools and ecosystems. |
| Agent authority | `src/core/ara6/agents/agentRoles.ts` | Role profiles, authority ladder, deny-by-default checks and audit-sink interface. Durable audit delivery and end-to-end enforcement must be verified across every execution path. |
| Bootstrap | `src/core/ara6/bootstrap.ts` | Imports default tools, capabilities, agents and evolution registration. |
| Default tools | `src/core/ara6/defaultTools.ts` | Includes Fresh AI/dimensional reasoning, research transport and placeholder-style analysis handlers for some operations. Registration does not prove every advertised operation is fully implemented. |
| Evolution graph | `src/core/ara6/evolution/evolutionGraph.ts` | In-memory node registration and parent-child lookup; not a validated self-improving system. |

### What this means today

The repository contains an early Ara6 agent/tool orchestration framework with governance concepts. The inspected files do **not** establish that Ara6 already has:
- an independent programming language;
- a lexer, parser, compiler, interpreter or native runtime;
- a production-grade distributed compute fabric;
- an independently trained foundation model;
- autonomous self-improvement validated by controlled experiments;
- robotics control software validated against physical hardware.

These are future engineering programmes. Any claims about them must be supported by code, tests, benchmarks and deployment evidence.

## 4. Target platform architecture

The target architecture is modular. Each subsystem exposes versioned contracts and can be developed and tested independently.

### A. Ara6 Language & Runtime pipeline

`Source → Lexer → Parser → AST → Semantic Analysis → Type Checking → IR → Optimizer → Backend → Runtime`

Required supporting systems:
- deterministic diagnostics with source locations;
- language specification and conformance tests;
- module and package resolution;
- standard library and versioning;
- execution sandbox, capability-based permissions and resource quotas;
- reproducible builds, debugging and profiling.

**First milestone:** a small, documented language subset that can tokenize, parse, validate and execute a deliberately limited set of programs in a sandbox. Do not start with claims of replacing established languages.

### B. Ara6 execution and orchestration fabric

- Task model, durable queue and scheduler
- Worker registration, leases, heartbeats and retries
- Idempotency, cancellation, deadlines and back-pressure
- Resource-aware placement across local CPU and permitted cloud resources
- Artifact storage, provenance, logs and trace correlation
- Policy enforcement before tools or workers perform side effects

The existing in-memory task engine and tool registry are prototypes to build on, not substitutes for these distributed guarantees.

### C. Ara6 Intelligence / Fresh AI

- Input and perception adapters
- Context, memory and retrieval with consent and retention controls
- Reasoning and planning services
- Tool selection through governed capability contracts
- Practice and candidate-generation pipelines
- Independent evaluation and regression testing
- Dataset lineage, model registry and checkpoint verification
- Inference serving, monitoring and rollback

Research ambition remains open-ended, including the pursuit of capabilities beyond artificial superintelligence. That is a long-term aspiration, not a present capability claim or a guaranteed outcome. Progress must be measured against a changing external frontier and task-specific benchmarks; no single scalar score adequately captures intelligence.

### D. Ara6 Computing

- Provider-neutral compute interface
- Workload classification and resource estimator
- Scheduler that selects only available, authorized and budget-safe resources
- CPU-first fallback and opportunistic permitted accelerators
- Queueing, quotas, cost ceilings, cancellation and usage reporting
- Distributed execution only where network, storage and failure costs are justified

**Free-first constraint:** initial development should use available free tiers, local/CPU execution and permitted credits. Never assume free services provide sustained large-scale compute. Paid resources must not be activated or incurred without explicit owner approval. Keep provider lock-in low.

### E. Ara6 Robotics

- Start with software simulation and recorded/synthetic test scenarios
- Define sensor, actuator and robot-description interfaces
- Separate high-level planning from low-level control
- Add hard safety limits, emergency stop and human override
- Test faults, latency, uncertainty and unsafe commands
- Require simulation and independent safety validation before physical trials

## 5. Shared governance and security principles

1. **Least privilege:** every agent, service and tool receives only the permissions it needs.
2. **Deny by default:** unknown identities, tools, permissions and execution contexts are rejected.
3. **Owner-controlled critical actions:** production deployment, release, financial movement, destructive data changes and physical actuation require explicit policy and human approval.
4. **Auditable decisions:** record actor, task, tool, input/output references, policy decision, approval, timestamp and outcome without leaking secrets.
5. **Durable state:** important tasks, approvals, audit records and model metadata must survive restarts.
6. **Data protection:** consent, purpose limitation, access controls, retention and deletion processes apply to learning and product data.
7. **Supply-chain security:** pin and verify dependencies, artifacts, model checkpoints and build provenance.
8. **Safe failure:** timeouts, cancellation, retries and partial failures must not duplicate side effects.
9. **Evidence-based claims:** a feature is complete only when implementation, tests and operational verification support the claim.

The current role/authority implementation is a useful starting point, but must be threat-modelled and tested against bypasses, concurrent execution, stale approvals, replay and persistence failures.

## 6. Phased zero-capital-first roadmap

### Phase 0 — Establish the baseline
- Map all Ara6 source files, tests, callers and runtime integration points.
- Identify duplicate registries, unused code, placeholders and security gaps.
- Add architecture decision records and ownership boundaries.
- Establish baseline tests and CI checks.
- Preserve existing Fresh Web Lite features; no disruptive rewrite.

**Exit gate:** reproducible inventory, passing baseline tests and documented risks.

### Phase 1 — Harden the existing Ara6 core
- Define typed contracts for tasks, tools, capabilities, agents and audit events.
- Add durable persistence adapters behind interfaces.
- Enforce authorization centrally at the execution boundary.
- Add concurrency-safe idempotency, cancellation and bounded retries.
- Add unit, integration, security and failure-injection tests.
- Replace placeholder handlers only when backed by real service contracts.

**Exit gate:** restart-safe task and audit behaviour, tested policy enforcement and no unapproved side effects.

### Phase 2 — Build a minimal Ara6 Language prototype
- Publish a concise language design and non-goals.
- Implement lexer, parser, AST and useful diagnostics.
- Add semantic checks and a tiny interpreter or bytecode VM.
- Add sandboxing, execution limits and conformance tests.
- Provide a command-line developer workflow.

**Exit gate:** documented programs compile/interpret reproducibly in a restricted environment with automated tests.

### Phase 3 — Build the provider-neutral compute scheduler
- Add workload/resource contracts and queue semantics.
- Support local CPU execution first.
- Add permitted free/credit-based workers as optional adapters.
- Measure latency, throughput, reliability and actual resource consumption.
- Enforce hard budget and quota ceilings.

**Exit gate:** tasks execute and recover predictably across at least two genuinely available execution backends without hidden paid usage.

### Phase 4 — Advance Fresh AI with evaluation discipline
- Connect consented learning-event sources.
- Separate candidate preparation from model training and production inference.
- Build benchmark suites and held-out evaluations.
- Verify checkpoint identity, hashes, provenance and compatibility.
- Register a model only after repeatable validation.

**Exit gate:** reproducible evaluation and safe model lifecycle; no unsupported intelligence-level claims.

### Phase 5 — Robotics simulation and research
- Build simulation interfaces and safety contracts.
- Test perception, planning and control in simulation.
- Establish independent safety review before hardware trials.

**Exit gate:** validated simulation performance and documented safety case.

### Phase 6 — Company formation and funded expansion
- Verify company-name and trademark availability in relevant jurisdictions.
- Obtain legal/accounting advice and register only when affordable and appropriate.
- Define IP ownership, governance, contracts and compliance.
- Reinvest verified product revenue into infrastructure, research, operations and reserves.
- Consider dedicated hardware only when measured workload and sustainable finances justify it.

**Exit gate:** legal and financial readiness; no assumption that registration, funding or revenue is already secured.

## 7. Engineering rules for all Ara6 work

- Inspect before changing; map call sites and existing contracts first.
- Work on isolated branches and submit reviewable pull requests.
- Never silently replace an existing subsystem or remove working Fresh Web Lite functionality.
- Every meaningful change includes tests and an explicit verification report.
- Fix failing checks before merge; owner retains merge and deployment authority.
- Separate prototype, beta and production status.
- Record decisions, trade-offs, limitations and evidence.
- Prefer small Android-friendly development workflows and low-cost infrastructure.
- Do not make background/autonomous progress claims unless a real scheduled worker or automation is configured and observable.

## 8. Immediate implementation backlog

1. Inventory the full `src/core/ara6` tree and all imports/call sites.
2. Locate and run existing Ara6 tests; establish coverage and CI status.
3. Trace every tool invocation from UI/API entry point through authorization to handler.
4. Verify whether audit records reach durable storage and whether all critical operations are gated.
5. Inspect task persistence, scheduling and concurrency assumptions.
6. Mark each registered tool as real, partial, placeholder or unavailable.
7. Propose a minimal Ara6 language specification only after the platform boundaries are mapped.
8. Open focused follow-up issues/PRs with acceptance criteria; do not merge unverified changes.

## 9. Definition of success

Ara6 succeeds by delivering independently useful, dependable technologies—not by names, diagrams or unsupported claims. Each division must produce measurable outputs that can be used by Fresh products and external developers, businesses or industries.

The long-term ambition can remain extraordinarily large. The engineering path must remain testable, safe, financially realistic and honest at every step.


## 10. Expanded implementation audit

A second pass inspected the workflow, agent-runtime, governance and verification files on `main`:

| Area | File | Verified behaviour / limitation |
|---|---|---|
| Workflow orchestration | `src/core/ara6/orchestrator.ts` | Creates workflows and mirrors task status into the task engine; in-memory arrays, no durable queue, worker leases, dependency scheduler or recovery. |
| Workflow graph | `src/core/ara6/workflowGraph.ts` | Stores nodes and marks a node complete; does not itself schedule dependencies or execute nodes. |
| Agent runtime | `src/core/ara6/agents/agentRuntime.ts` | Resolves tools, applies the Fresh AI TRUEMODE evidence gate, calls role authorization, then executes through the tool registry. The runtime and authorization path need broader adversarial and integration testing. |
| Constitution | `src/core/ara6/aes/constitution.ts` | Declares mandatory rules for duplicate features, permissions, owner approval, security, testing, explainability and learning. A rule declaration alone does not prove every rule is enforced. |
| World model | `src/core/ara6/world/registerCore.ts` | Registers Fresh Core, Fresh AI, Ara6, Wallet and Feed as world-model nodes; descriptive registration, not a live digital twin. |
| Core DNA registry | `src/core/ara6/dna/registerCoreDNA.ts` | Registers core ecosystem metadata; not executable biological or self-modifying code. |
| Agent-role tests | `scripts/verify-fresh-agent-roles.mjs` | Static/runtime checks cover unknown roles, tool scoping, production denial, approvals and audit behaviour. This is useful coverage but not a complete security audit. |
| Role documentation | `docs/FRESH_AI_AGENT_ROLES.md` | Explicitly records that the durable `fresh_trust_audit` sink is not wired and that some authority ladder levels are not yet used by registered tools. |

### Immediate risks and priorities from this audit

1. **Durable audit is a known gap.** The current role audit trail is in memory; the documented database sink is not wired. Implement a durable adapter with failure-safe behaviour and tests before treating auditability as production-ready.
2. **The workflow orchestrator is a state coordinator, not a scheduler.** It marks tasks running/completed but does not provide worker execution, dependency ordering, leases, retries across restarts or distributed recovery.
3. **Authorization coverage needs an end-to-end proof.** Keep authorization before execution, and test all invocation paths, including direct registry calls, explicit tool IDs, retries, concurrent requests, stale approvals and unknown tools.
4. **Constitution rules need enforcement mapping.** For each mandatory rule, identify its enforcement point and test. Rules with no enforcement point must be labelled policy-only, not implemented controls.
5. **Tool labels must match behaviour.** The default wallet/feed handlers currently route through a generic analysis response rather than a real financial/social operation. Do not expose them as completed transaction capabilities until real backend contracts and integration tests exist.
6. **Evolution graph is metadata, not self-improvement.** Any learning/evolution claim requires durable provenance, controlled experiments, independent evaluation and rollback.

This expanded audit is still a source-level review. It does not claim that the repository was cloned, the full test suite was executed, a browser session was validated or a deployment was performed.
