# Ara6 Phase 0 — Operational Baseline Report

**Status:** Source-level inventory and execution-path audit in progress  
**Baseline branch:** `main`  
**Baseline commit:** `9553f1e332d2602ac73efd41028880ed408221af`  
**Audit date:** 2026-11-17  
**Change scope:** Documentation only; this report does not modify runtime code, production configuration, or deployments.

## 1. Executive summary

The baseline contains **52 files under `src/core/ara6`**. The current implementation is an early in-memory agent/tool framework with a Fresh AI integration path, plus several separate AES (autonomous engineering), DNA, world-model and evolution prototypes.

The strongest end-to-end path is:

`FreshAIKernel.execute → executeFreshPlanThroughAra6 → AgentRuntime.execute → authorizeAgentAction → ToolRegistry.execute → registered handler`

The Software Workspace task UI is a separate, much simpler path. It creates task records and changes their status; its Run action does not invoke an agent, tool handler, code executor, or worker.

The repository has successful CI coverage for Fresh AI contracts, agent-role governance, lint and build. However, there is no dedicated Ara6 unit/integration test suite exercising all 52 modules. A passing CI workflow is not proof that every advertised Ara6 capability is real.

## 2. Complete module inventory

### Core orchestration and execution — 12 files

| File | Responsibility | Current operational classification |
|---|---|---|
| `task.ts` | Task shape and status types | Contract/type definition |
| `engine.ts` | Create/start/complete/fail/list tasks | In-memory task state only |
| `orchestrator.ts` | Workflow creation and task-state coordination | In-memory coordinator; not a worker scheduler |
| `decisionEngine.ts` | Decision result/request contract and decision selection | Lightweight decision logic; requires behavioural tests |
| `toolExecution.ts` | Tool input/context/result/policy contracts | Contract/type definition |
| `toolRegistry.ts` | Tool registration and handler invocation | Functional in-process executor with approval check, timeout, retries and completed-result idempotency cache |
| `capabilityRegistry.ts` | Capability catalogue | In-memory registry |
| `defaultTools.ts` | Six default tool handlers | Mixed: reasoning and search have real paths; wallet/feed/security use generic analysis handler |
| `defaultCapabilities.ts` | Website, money and video capability declarations | Metadata only; registration does not implement those workflows |
| `bootstrap.ts` | Imports default tools, capabilities, agents and evolution registration | Active bootstrap for these four registrations |
| `workflowGraph.ts` | Workflow graph storage and node completion | In-memory graph; does not schedule or execute dependencies |
| `agents/agent.ts` | Agent/task/result contracts | Contract/type definition |

### Agent runtime and governance — 3 additional files

| File | Responsibility | Current operational classification |
|---|---|---|
| `agents/agentRoles.ts` | Role profiles, authority ladder, authorization and audit sink | Functional policy gate; audit is in-memory unless an external sink is wired |
| `agents/agentRuntime.ts` | Agent registration, tool resolution, TRUEMODE and role gate | Functional in-process execution path |
| `agents/defaultAgents.ts` | Registers 13 operational agents | Registration works; many agents share reasoning/search handlers rather than specialized engineering executors |

### AES — Autonomous Engineering System — 25 files

| Area | Files | Current operational classification |
|---|---|---|
| Team and collaboration | `aes/agentTeam.ts`, `aes/collaborationEngine.ts` | In-memory agent catalogue and simple collaboration coordination |
| Governance | `aes/constitution.ts` | Rule declarations; enforcement must be mapped individually |
| Engineering task | `aes/engineeringTask.ts`, `aes/taskManager.ts` | Task data and in-memory task management |
| Evolution journal | `aes/evolution/engineeringJournal.ts` | In-memory journal |
| Evolution engine | `aes/evolution/evolutionEngine.ts`, `aes/evolution/improvement.ts`, `aes/evolution/selfEvaluation.ts` | Proposal storage/approval is in-memory; self-evaluation currently returns fixed scores |
| Discovery | `aes/gapDetector.ts`, `aes/opportunityDetector.ts` | Lightweight rule-based detection; needs input/quality tests |
| Mission | `aes/mission.ts`, `aes/missionManager.ts` | Mission data and in-memory lifecycle state |
| Proposal | `aes/proposal.ts`, `aes/proposalManager.ts` | Proposal data and in-memory lifecycle state |
| Research | `aes/researchEngine.ts`, `aes/researchReport.ts` | Local report assembly; no demonstrated autonomous research execution pipeline |
| Review | `aes/review/engineeringCouncil.ts`, `aes/review/review.ts`, `aes/review/reviewManager.ts` | In-memory review collection; approval logic has a fail-open empty-review defect (see risks) |
| Simulation | `aes/simulation/riskAnalyzer.ts`, `aes/simulation/simulationEngine.ts`, `aes/simulation/simulationResult.ts`, `aes/simulation/validationEngine.ts` | Simulation returns fixed passing scores; validation always returns valid |

### DNA — 4 files

| File | Responsibility | Current operational classification |
|---|---|---|
| `dna/capabilityDNA.ts` | Capability metadata contract | Type definition |
| `dna/dnaRegistry.ts` | DNA registration and lookup | In-memory registry |
| `dna/ecosystemDNA.ts` | Ecosystem metadata contract | Type definition |
| `dna/registerCoreDNA.ts` | Registers Fresh Core, Fresh AI and Ara6 metadata | Registration module exists but is not imported by `bootstrap.ts` |

### Evolution graph — 3 files

| File | Responsibility | Current operational classification |
|---|---|---|
| `evolution/evolutionGraph.ts` | Evolution node storage and parent-child lookup | In-memory metadata graph |
| `evolution/evolutionNode.ts` | Evolution node contract | Type definition |
| `evolution/registerEvolution.ts` | Registers three search lineage nodes | Imported by bootstrap; metadata only, not self-improvement |

### World model — 5 files

| File | Responsibility | Current operational classification |
|---|---|---|
| `world/dependency.ts` | Dependency contract | Type definition |
| `world/dependencyAnalyzer.ts` | Finds dependencies connected to a node | In-memory lookup |
| `world/registerCore.ts` | Registers Fresh Core, Fresh AI, Ara6, Wallet and Feed | Registration module exists but is not imported by `bootstrap.ts` |
| `world/systemNode.ts` | System-node contract | Type definition |
| `world/worldModel.ts` | System/dependency storage and lookup | In-memory model; not a live digital twin |

**Inventory count:** 12 core/orchestration files + 3 additional agent/governance files + 25 AES files + 4 DNA files + 3 evolution files + 5 world-model files = **52 files**.

## 3. Runtime registration map

### Bootstrap path

`SoftwareWorkspace.tsx → src/core/ara6/bootstrap.ts`

Bootstrap imports:
- `defaultTools.ts`
- `defaultCapabilities.ts`
- `agents/defaultAgents.ts`
- `evolution/registerEvolution.ts`

It does **not** import:
- `dna/registerCoreDNA.ts`
- `world/registerCore.ts`
- `aes/defaultEngineeringAgents.ts`

The AES engineering team is a separate registry from the 13 agents in `AgentRuntime`. Do not treat those eight AES team profiles as operational runtime agents without an explicit adapter and execution path.

### Fresh AI execution path

`FreshAIKernel.execute`
→ checks supplied TRUEMODE decisions and rejects missing or blocked evidence
→ `executeFreshPlanThroughAra6`
→ checks approval requirement and agent registration
→ `AgentRuntime.execute`
→ applies Fresh AI TRUEMODE evidence check
→ resolves tool
→ `authorizeAgentAction`
→ `ToolRegistry.execute`
→ handler
→ returns execution result.

The source-level path is present. A successful integration test of every agent/tool combination has not been established.

### Software Workspace task path

`SoftwareWorkspace.addTask` → `ara6Engine.create`  
`SoftwareWorkspace.runTask` → `ara6Engine.start`  
`SoftwareWorkspace.completeTask` → `ara6Engine.complete`

The Run button only changes the task status to `running`; it does not execute a task. The seeded workflow is marked completed and has no tasks. This UI is currently a task-state demonstration, not autonomous software engineering.

## 4. Tool and capability truth table

| Registered tool | Handler | Evidence-based status |
|---|---|---|
| `fresh-ai` | Dimensional reasoning handler | Calls `reasonAcrossDimensions`; in-process reasoning adapter |
| `reasoning` | Dimensional reasoning handler | Calls `reasonAcrossDimensions`; in-process reasoning adapter |
| `search` | POST to `/api/research/search` | Real transport path; depends on request origin and endpoint availability |
| `wallet` | Generic analysis handler | Placeholder; does not move money |
| `feed` | Generic analysis handler | Placeholder; does not publish social content |
| `security` | Generic analysis handler | Generic analysis only; not a demonstrated security scanner or enforcement engine |

Capability declarations:
- `build-website` references Fresh AI and security tools.
- `send-money` references wallet and security tools.
- `publish-video` references feed and Fresh AI tools.

These are catalog entries, not complete end-to-end capability implementations.

## 5. Test and CI map

### Direct Ara6 governance verification

- Script: `scripts/verify-fresh-agent-roles.mjs`
- Command: `npm run test:fresh-agent-roles`
- Workflow: `.github/workflows/fresh-ai-integrity.yml`
- Coverage includes unknown-role denial, prototype-key denial, tool scoping, production denial, authority mapping, literal approval, in-memory audit behaviour and static checks that TRUEMODE/role authorization occur before tool execution.

Limitations:
- It is not a complete behavioural integration suite for every tool handler.
- It verifies the in-memory audit sink and its failure isolation; it does not prove durable database audit persistence.
- Some checks inspect source text rather than executing adversarial scenarios.

### Fresh AI integration verification

- `scripts/verify-truemode-research-persistence.mjs` checks the TRUEMODE/kernel integration contract and that TRUEMODE is checked before the Ara6 bridge.
- The Fresh AI integrity workflow also runs Fresh AI engine-fabric, capability, reasoning, inference, grounding, security and related contract checks.

These tests provide adjacent integration evidence, but they do not amount to unit/integration coverage of all 52 Ara6 modules.

### CI evidence observed

GitHub Actions run `44031080863` on baseline `main` at `9553f1e` completed successfully on 2026-11-17. Its Fresh AI integrity job passed all listed steps, including:
- Fresh agent roles and authority
- TRUEMODE-related integration contracts
- Repository lint
- Production build

GitHub Actions run `44033963665` for the documentation PR branch at `4d0c2db` also completed successfully with the same Fresh AI integrity job.

This is CI evidence for the configured workflow, not a claim that a new local test run was performed during this audit.

### Test discovery limitation

The repository has many `scripts/verify-*.mjs` contract checks in addition to files named `*.test.*`. A filename-only search undercounts test coverage. The next test-mapping pass must inspect the package scripts and workflow definitions, then map each script's assertions to its target module and distinguish static assertions from runtime tests.

## 6. Confirmed defects and risks

### P0 — Fail-open engineering review

`aes/review/reviewManager.ts` implements approval using `getMissionReviews(missionId).every(...)`. JavaScript `every` returns true for an empty array. Therefore a mission with no reviews can be reported as approved. This must be fixed before the review result is trusted for any gated action.

### P0 — Simulation and validation are not evidence-producing

- `simulationEngine.simulate` always returns `passed: true` and fixed scores.
- `validationEngine.validate` always returns `valid: true` with no errors/warnings.
- `selfEvaluation.run` returns fixed scores.

These are placeholders, not safety gates. They must never authorize a release, execution or claim of validated quality.

### P1 — Tool/agent authorization boundary

The repository search found `toolRegistry.execute` called by `agentRuntime.execute` in the Ara6 runtime. The exported registry itself enforces tool enabled state, approval policy, handler existence, timeout/retry and completed-result idempotency, but it does not independently apply the agent-role policy. The architecture should make the authorization boundary unbypassable if additional callers are introduced. Verify all imports/callers before changing it.

### P1 — In-memory state and audit

Task engine, workflow orchestrator, workflow graph, agent team, AES managers, DNA registry, evolution graph, world model and audit history use process-local memory. They do not survive restart. The audit sink is optional and no durable sink was verified as wired.

### P1 — Registration gaps

Core DNA, world-model registrations and AES default engineering agents are not imported by the main Ara6 bootstrap. Their existence in source does not prove they are active at runtime.

### P1 — Capability misrepresentation

Wallet and Feed handlers return generic analysis output. The advertised send-money and publish-video capabilities therefore do not currently perform their named operations through these handlers.

### P2 — Weak task semantics

The Software Workspace Run button marks tasks as running without executing them. Workflow graph completion marks nodes complete but does not enforce dependencies or execute assigned agents.

## 7. Phase 0 remaining work

1. Map all callers/imports for each of the 52 modules and classify production, UI, test-only and orphaned paths.
2. Inspect all `package.json` test scripts and CI workflows; map each test to modules and assertion type.
3. Inspect the latest relevant workflow logs for the exact test output and confirm no hidden skips.
4. Add a dedicated Ara6 test matrix (proposal only until separately approved): engine lifecycle, orchestrator state transitions, tool execution failures/timeouts/retries/idempotency, authorization bypass attempts, approval semantics, review fail-closed behaviour, registration/boot order, persistence and restart recovery.
5. Establish a module-by-module status: operational, partial, metadata-only, placeholder, unregistered or unverified.
6. Produce an architecture dependency/call graph and prioritized risk register.

## 8. Change and production boundary

This report is documentation only. No Ara6 source code, production environment, secrets, database, deployment, or production branch has been changed as part of this audit. No pull request has been merged. The report is intended to be reviewed on the existing documentation branch before any hardening implementation is proposed.
