# Fresh AI Intelligence Taxonomy and Integration Contract

**Status:** Integration contract for the Fresh AI architecture. This document maps established AI terms, research directions and long-term intelligence ambitions to Fresh-owned engineering work. It does not claim that AGI, ASI, quantum AI, consciousness, production robotics or any untrained model capability exists.

**Canonical identity:** `fresh-unified-1`  
**Owner:** Fresh AI  
**Integration rule:** Extend the canonical Intelligence Gateway, capability registry, Universal Power Fabric, Astra, memory, evidence/TRUEMODE, evaluation and governance. Do not create disconnected chatbots or duplicate sources of truth.

## 1. Intelligence levels — goals, not runtime switches

| Term | Meaning in Fresh AI | Engineering treatment | Current claim |
|---|---|---|---|
| ANI | Narrow task intelligence | Baseline capability-specific systems and evaluations | Some narrow software capabilities exist; each needs its own readiness evidence |
| AGI | Broad generalization across domains and unfamiliar tasks | Long-term cross-domain research target with independent benchmarks | Not achieved or claimed |
| ASI | Intelligence exceeding human performance across nearly all relevant domains | Long-term research horizon; safety and governance research required before any deployment claim | Not achieved or claimed |
| MSI / machine superintelligence | Informal label sometimes used for machine intelligence beyond human-level | Treat as a research phrase, not a standardized capability level | No claim |
| HAI / human-AI collaboration | Human and AI jointly solve tasks | Human approval, delegation, review, correction and transparent control | Implement through governed workflows |
| Collective intelligence | Multiple agents or systems contribute to a shared task | Coordinated, independently evaluated agents with provenance and conflict resolution | Architecture target |
| Meta-intelligence | Selects, evaluates and coordinates reasoning strategies and specialist systems | Meta-planner over existing modes and registered capabilities | Architecture target |
| Recursive self-improvement | A system proposes and evaluates changes to improve itself | Proposal-only experiments, isolated training, independent evaluation and human promotion | Autonomous production self-modification prohibited |

AGI and ASI are not checkboxes that can be enabled by adding a label. Claims require independently reproducible evaluations across broad, unfamiliar tasks, robustness, safety, and real-world deployment conditions.

## 2. Core architecture patterns

| Term | Fresh AI integration |
|---|---|
| Mixture of Experts (MoE) | Research sparse expert routing inside Fresh-owned model training/serving; do not simulate MoE with labels |
| Multi-agent AI | Specialist agents coordinated by the Universal Power Fabric under one Fresh identity |
| Agentic AI | Goal decomposition, bounded plans, registered tools, checkpoints, approval and verified completion |
| Neuro-symbolic AI | Combine learned representations with explicit rules, typed constraints, logic and verifiable computations |
| World models | Extend Astra's provenance-aware world state with dynamics, uncertainty, prediction and action consequences |
| Cognitive architecture | Cognitive Mind Fabric modes plus memory, planning, perception, executive control and verification |
| Hierarchical AI | Coordinate strategic, task and action planning with bounded responsibilities at each level |
| Federated learning | Optional privacy-preserving training across participating devices only with consent, secure aggregation and verified update governance |
| Continual learning | Governed learning pipeline with replay, regression evaluation, rollback and protection against catastrophic forgetting |
| Self-supervised learning | Fresh-owned pretraining objectives over rights-cleared, privacy-screened data with contamination checks |

## 3. Cognitive and reasoning systems

Integrate the Cognitive Mind Fabric as strategies selected by a bounded planner, not separate model identities:

- Analytical, critical and probabilistic reasoning.
- Creative, lateral and abstract exploration.
- Concrete and evidence-grounded reasoning.
- Systems and causal reasoning.
- Practical and executive planning.
- Reflective/metacognitive error and uncertainty review.
- Integrative reasoning that preserves unresolved disagreements.
- Language, communication and translation.
- Perceptual/multimodal interpretation.
- Authorized memory and retrieval.

Each strategy declares its purpose, required capabilities, contraindications, resource budget, status and evaluation suite. The planner selects the smallest useful set and cannot bypass permissions, TRUEMODE, source checks or human approval. User-facing explanations provide evidence, assumptions and uncertainty, never private chain-of-thought.

## 4. Modality and application capabilities

| Term | Fresh AI system | Required real execution evidence |
|---|---|---|
| NLP | Fresh language understanding and generation | Language/task evaluations, factuality, multilingual and safety tests |
| Computer vision | Fresh Vision / Astra perception | Real image/document inference, visual grounding and privacy tests |
| Multimodal AI | Shared text, image, audio, video and spatial workflows | Each modality and cross-modal task independently evaluated |
| Embodied AI | Astra and Fresh Robotics | Sensor provenance, world state, bounded action and hardware safety tests |
| Generative AI | Fresh-owned text, image, audio, video and 3D generation | Validated persisted artifact from a deployed Fresh-owned engine |
| Predictive AI | Forecasting and scenario prediction | Held-out temporal evaluation, calibrated uncertainty and drift monitoring |
| Autonomous AI | Governed digital workflows and future machine operations | Scoped permissions, dry run, approval, audit, verification and rollback |
| Scientific AI | Fresh Science | Reproducible calculations, citations, simulation provenance and expert review |

Fresh Video must support a real job lifecycle and artifact persistence, including text/image/video-to-video, multi-shot consistency, audio synchronization and long-form assembly. A queued job, storyboard or mock preview is not a completed generation.

## 5. Emerging research tracks

These are research programs, not promises of immediate production features:

- **Quantum AI:** investigate quantum algorithms and quantum/classical hybrid workflows only where suitable hardware and measurable advantage exist. Classical fallback remains explicit.
- **Neuromorphic computing:** investigate event-driven, energy-efficient inference and sensor processing on compatible hardware.
- **Evolutionary AI:** use bounded evolutionary search for architecture, policies or solutions in isolated experiments; validate candidates before promotion.
- **Self-organizing systems:** study adaptive organization of agents/resources with stability, interpretability and governance constraints.
- **Swarm intelligence:** explore distributed agents for optimization, sensing and simulation; retain per-agent accountability and global safety constraints.
- **Causal AI:** build causal graphs and intervention-aware reasoning; distinguish observed correlations from identified causal effects.
- **Scientific discovery:** use literature synthesis, formal derivation, simulations and hypothesis generation with reproducible evidence.
- **Non-human/alien cognition research:** use explicitly hypothetical agents, synthetic data labels and reproducible protocols; never imply extraterrestrial contact or evidence.
- **Stewardship principles:** humility, truthfulness, pluralism, non-manipulation, accountability and protection of human agency are governance tests, not claims of divinity or consciousness.

## 6. Cross-cutting platform services

All tracks share one governed foundation:

1. Identity, consent, authorization and least-privilege access.
2. Model/module registry with version, ownership, checkpoint hash and readiness state.
3. Data manifests recording rights, source, transformations, exclusions and consent.
4. Training orchestration, reproducible runs and immutable checkpoint artifacts.
5. Capability-specific evaluation, red-team tests and regression suites.
6. Inference/job orchestration with quotas, timeouts, cancellation and structured errors.
7. Evidence ledger, calibrated uncertainty, contradiction handling and TRUEMODE decisions.
8. Scoped memory, provenance, correction and retention/deletion controls.
9. Observability, cost/latency/resource monitoring, canary release and rollback.
10. Human review and independent safety controls for consequential actions.

Fresh-owned model weights remain the source of Fresh AI intelligence. External compute, storage, sensors, datasets with documented rights and non-AI infrastructure may support the platform; external AI models must not silently answer or generate under the Fresh AI identity.

## 7. Readiness vocabulary

Use the existing canonical capability registry and align its status vocabulary to these meanings. The executable terminology-to-backend map is maintained in `src/core/fresh-ai/FreshAIBackendReadiness.ts` and is exposed by `/api/ai/status` and `/api/ai/ask`:

- `research`: idea or scientific exploration; no executable product promise.
- `contracted`: typed design exists; runtime may not exist.
- `implemented`: code boundary exists; production dependencies and end-to-end behavior may still be unverified.
- `training-required`: required Fresh-owned weights are not registered and verified.
- `configured-not-verified`: configuration exists but real inference has not passed verification.
- `evaluation-required`: implementation exists but release thresholds are not met.
- `production-verified`: deployed end-to-end behavior passed capability-specific evaluation and operational checks.
- `blocked`: safety, privacy, authorization or reliability gate prevents execution.

Do not mark AGI/ASI as capability registry entries. They are broad research goals assessed by evidence across many capabilities.

## 8. Implementation sequence

1. Reconcile this taxonomy with the existing Cognitive Mind Fabric, Astra and Expanded Intelligence Architecture proposals; keep one canonical registry and gateway.
2. Add typed cognitive strategy contracts and a deterministic, bounded mode planner; test selection, conflict handling, budgets and stop conditions.
3. Extend the capability registry with explicit modality/research ownership, readiness and evaluation references without marking unbuilt engines implemented.
4. Complete real Fresh-owned inference and serving for the unified core, then vision, audio, video and spatial modules with separate checkpoints and evaluations.
5. Extend Astra world models and simulation; keep robotics observation/simulation-only until machine-specific safety and hardware validation pass.
6. Add Fresh Science and causal/predictive evaluation workflows with reproducibility and expert review.
7. Add governed continual/federated/self-supervised training pipelines; no private user data becomes training data by default.
8. Research MoE, neuro-symbolic, neuromorphic, quantum, evolutionary and swarm approaches through isolated benchmarks before adopting them.
9. Add cross-domain benchmark suites before making any general-intelligence claims.
10. Validate CI, mobile usability, deployment health, operational monitoring and honest degraded behavior.

## 9. Non-negotiable safety and truth rules

- No claims of AGI, ASI, consciousness, omniscience or supernatural authority without evidence; consciousness is not inferred from fluent conversation.
- No autonomous modification of production code, model weights, permissions, safety policy or deployment.
- No physical actuation from a model directly; machine-specific safety supervisors, independent emergency stops and human takeover are mandatory.
- No external action without scoped authorization; high-impact actions require explicit approval.
- No fabricated inference, generation, research, prediction, scientific result or completed action.
- No promotion based only on a passing static test, training loss, registry row or UI control.
- Preserve uncertainty, provenance, unresolved disagreement and truthful unavailable states.

## 10. Definition of done

This taxonomy is integrated when the cognitive planner and module registry are wired to the canonical Fresh AI gateway; each executable capability has a real Fresh-owned runtime or explicitly identified deterministic controller; tests cover contracts, permissions, failure states and safety; evaluation results are linked; and deployed behavior is independently verified. Architecture documentation alone does not satisfy this definition.
