# Fresh AI capability learning and multiplication architecture

## Decision

Fresh AI should study how proven systems work, identify the general capabilities and system flows that make them effective, then build Fresh-owned implementations that can be composed across Fresh Web Lite. Do not copy a vendor's product wholesale, rely on a compatible API shape as a substitute for intelligence, or claim Fresh-trained inference when a different component produced the output.

The goal is not to imitate one answer endpoint. It is to build a capability system that can learn from authorized evidence and evaluations, combine specialized tools, keep information current, and add Fresh-specific powers.

## 1. Learn mechanisms, not just interfaces

For every target capability, conduct an evidence-backed engineering study:

1. **Observe** public documentation, standards, papers, demos, and behavior that we are authorized to inspect.
2. **Decompose** the capability into input contracts, stages, models/algorithms, state, retrieval, tools, safety checks, output contracts, failure modes, latency/cost constraints, and evaluation.
3. **Trace the flow** end-to-end: request → interpretation/planning → data or tool acquisition → execution → evidence/provenance → validation → response/artifact → persistence/feedback.
4. **Compare alternatives** including open standards, permissively licensed code, documented APIs, and Fresh-owned implementations. Check licenses and terms before reuse.
5. **Build a capability specification** with acceptance tests, security boundaries, data rights, quality metrics, and explicit unknowns.
6. **Implement a Fresh-native or replaceable adapter** behind a stable internal contract. Do not make one provider's API the canonical Fresh architecture.
7. **Test against baselines** using representative and adversarial cases, including poor network, mobile viewport, timeouts, empty results, stale information, contradictions, and malicious retrieved content.
8. **Record evidence**: commit, tests, metrics, provenance, known limitations, and whether each stage is merely designed, implemented, configured, verified, or production-verified.

Never infer proprietary internals from outputs alone. Mark inferred mechanisms as hypotheses and validate them experimentally.

## 2. Fresh-owned orchestration flow

```text
User request / workspace / authorized memory
                  |
                  v
      Intent + context interpretation
                  |
                  v
       Planner / capability selector
                  |
       +----------+-----------+
       |          |           |
       v          v           v
  Web research  Knowledge   Media / files /
  & retrieval   graph/RAG   code / actions
       |          |           |
       +----------+-----------+
                  |
                  v
       Normalize results and provenance
                  |
                  v
   Verify claims, freshness, conflicts, rights
                  |
                  v
      Fresh reasoning / model runtime
                  |
                  v
   Response, search results, or artifact
                  |
                  v
  User approval, scoped persistence, feedback
                  |
                  v
   Evaluation → approved improvements → tests
```

The planner must choose tools based on request and capability availability. Retrieval is not a substitute for answering; an answer model is not a substitute for search. Keep ranked Web, News, Academic, Posts, People, image/video, and related research as distinct retrievable result classes where supported. Every factual claim must retain the correct source mapping; do not attach a convenient but unrelated source.

## 3. Capability registry and contracts

Each capability record should specify:

- stable Fresh capability ID and version;
- user-facing purpose and supported input/output modalities;
- Fresh-owned implementation or replaceable provider adapter;
- declared, executable, configured, verified, and production-verified state;
- required environment/configuration without storing secrets in source;
- permissions, data residency/retention, licensing and provenance requirements;
- timeout, retry, cancellation, size limits, quotas and graceful degradation;
- observable stages, error taxonomy, metrics and cost;
- deterministic unit/contract tests plus end-to-end acceptance tests;
- dependencies and surfaces across Fresh ID, Fresh AI, Fresh Flow, Fresh Studio, Fresh Mail, search, files, and communications.

A registry entry is not proof that the capability works. The UI must not show a working action unless a real implementation is available; unsupported actions should explain the missing dependency and next step.

## 4. Capability families to study, build, and multiply

### A. Understanding and reasoning
Intent classification, multilingual understanding, context management, planning, tool selection, structured output, code execution in sandboxed environments, math, uncertainty calibration, and verification. Measure each separately; do not call a prompt template a trained model.

### B. Current information and research
Search crawling/index integrations where authorized, search provider adapters, freshness timestamps, source quality, deduplication, domain diversity, entity disambiguation, claim-level citations, contradiction detection, query expansion, follow-up questions, and separate media/news/academic/social result types. External services may provide current data, while Fresh owns orchestration, ranking policy, provenance, presentation, and evaluation.

### C. Knowledge and memory
A versioned knowledge graph, retrieval-augmented generation, user-controlled scoped memory, source lineage, temporal facts, conflict resolution, deletion/retention controls, and permissions enforced at query time. Never mix private user memory into public answers or leak cross-user content.

### D. Learning and model lifecycle
Distinguish runtime inference from training. Create a governed loop: authorized data → filtering/deduplication → privacy/licensing checks → reviewed labels or feedback → train/evaluate → regression and safety tests → versioned checkpoint → approved rollout → monitoring/rollback. No silent self-modification, unreviewed production training, or claims of learning from a chat unless that data actually enters an approved pipeline.

### E. Creation and media
Image, audio, video, documents, code, 3D and interactive artifacts should have separate engines and contracts. Reuse licensed/open components where suitable, preserve editable outputs when possible, and make job status, progress, cancellation, output URLs and errors real. A media worker being healthy does not prove the UI workflow is end-to-end functional.

### F. Actions and work
Tool/action planning, authorization, explicit approval for high-impact actions, least privilege, idempotency, audit logs, rollback/compensation and action-result verification. A generated plan is not evidence that an action executed.

### G. Identity, security and trust
Fresh ID session ownership, RLS, secret handling, tenant isolation, consent, provenance, abuse prevention, data minimization, encryption, access logging, export and deletion. Validate security on the server, not only in UI controls.

### H. User experience and accessibility
One coherent Fresh experience across phone and desktop, readable touch targets, responsive layouts, keyboard/screen-reader support, low-bandwidth behavior, resumable tasks, visible progress, and consistent capability availability across surfaces.

## 5. Multiply capabilities across Fresh

Build shared capability services once, then integrate them through explicit contracts into Fresh AI, Fresh Search/Research, Fresh Flow, Fresh Studio/Create, Fresh ID, Fresh Mail, files, and workspaces. Do not duplicate business logic in each UI. Each surface may add specialized UX, but identity, permissions, evidence, task status, observability, and capability semantics should remain consistent.

The multiplication test for every capability is:

- Can another Fresh surface call it through a documented contract?
- Are permissions and user context carried safely?
- Is provenance or artifact ownership preserved?
- Can it fail clearly and recover without corrupting state?
- Is the same acceptance suite run against each integration?
- Does it add a Fresh-specific improvement beyond parity?

## 6. Immediate engineering sequence

1. Remove the optional external answer shortcut from `/api/ai/ask` and keep the Fresh gateway/native inference boundary honest.
2. Inspect the current gateway and model runtime to verify how inference, retrieval, fallback and response status actually flow.
3. Add contract tests that distinguish native inference ready, training-required, external data retrieval unavailable, empty evidence, provider failure, and successful completion.
4. Fix the configured web research path and source/claim mapping without fabricating evidence; test freshness, deduplication, domain diversity, and identity conflicts.
5. Build the capability registry/report from actual runtime evidence, not only declarations.
6. Add integration tests for protected conversations, scoped memory, media job lifecycle, and mobile-visible error states.
7. Run CI and preview smoke tests; deploy only after verified gates pass, then verify production separately.

## 7. Non-negotiable truth labels

Use precise language in code, UI, logs, and reports:

- **Designed**: a written plan exists.
- **Implemented**: code exists.
- **Configured**: dependencies and credentials are present in the target environment.
- **Verified**: automated or manual tests passed for the named scope.
- **Production-verified**: the deployed production path passed end-to-end tests.

Keep Fresh native inference status separate from search/retrieval provider status and media engine status. If the Fresh checkpoint is still `training-required`, state that plainly. A successful CI build proves the tested build passes; it does not prove the whole ecosystem works in production.
