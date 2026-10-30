# Fresh AI Expanded Intelligence Architecture

**Status:** architecture and implementation contract. This document does not claim that any model, generator, robot controller, or autonomous machine is trained, deployed, or production-ready.

**Ownership rule:** Fresh AI's intelligence and generative model weights must be trained and owned by Fresh. External compute, storage, sensors, datasets with documented rights, simulators, and non-AI infrastructure may support the system. An external AI model must not silently answer, generate, plan, or control under the Fresh AI identity.

## AI terminology integration

The cross-cutting terminology map and integration contract is maintained in [`FRESH_AI_INTELLIGENCE_TAXONOMY.md`](./FRESH_AI_INTELLIGENCE_TAXONOMY.md). It maps ANI/AGI/ASI research goals, cognitive and agent architectures, learning methods, modalities, scientific AI, and emerging research tracks onto this architecture without treating names as proof of working capabilities.

## 1. Product definition

Fresh AI is the sovereign intelligence layer. Fresh Web Lite, Fresh Flow, Fresh Studio, and connected devices are application surfaces and execution environments that use it. Fresh AI is not limited to a chat interface: it must ultimately understand, reason, create, research, plan, and carry out approved work across digital and physical environments.

The long-term ambition is to exceed today's narrow assistant paradigm through cross-domain learning, verified creation, scientific and engineering problem-solving, and safe interaction with the physical world. “Beyond superintelligence” is a research ambition, not a claim that AGI/ASI has been achieved.

## 2. Model family

Use a coordinated family of Fresh-owned models and task heads, not the assumption that one small text checkpoint can perform every modality.

| Module | Responsibility | Minimum evidence before “ready” |
|---|---|---|
| Fresh Unified Intelligence Core | Language, instruction following, reasoning, planning, tool selection | Held-out task suites, truthfulness, safety, robustness, serving tests |
| Fresh Vision | Images, documents, camera frames, visual grounding | Image/document benchmarks, permission and privacy tests |
| Fresh Audio | Speech recognition, speech generation, sound understanding | WER / task quality, voice consent, audio safety and latency tests |
| Fresh Video | Temporal visual understanding and native video generation | Temporal consistency, prompt adherence, frame quality, audio sync, long-clip tests |
| Fresh Spatial & 3D | Geometry, scene understanding, 3D assets and spatial reasoning | Reconstruction / geometry tests, coordinate and collision tests |
| Fresh Robotics | Perception-to-action policies for specific robot classes | Simulation-to-real validation, bounded control, emergency-stop tests |
| Fresh Science | Scientific literature synthesis, calculation, simulation and hypothesis support | Reproducible calculations, source provenance, domain-expert review |
| Fresh Automation | Computer, application, device and industrial workflow planning | Sandboxed task success, least privilege, audit, rollback and recovery tests |

Each module has its own version, data manifest, training recipe, checkpoint hash, evaluation report, safety card, runtime contract, and promotion state. Shared representations may be developed where evidence supports them; module names are not proof that trained weights exist.

## 3. Native Fresh video creation

Fresh Video is a first-class Fresh AI capability and must connect to Fresh Flow and Fresh Studio through a single authenticated, governed creation path.

Required product modes:
- Text-to-video.
- Image-to-video.
- Video-to-video transformation and editing.
- Storyboard and multi-shot generation.
- Character, subject, wardrobe and scene consistency across shots.
- Camera movement, framing, lighting, motion and style controls.
- Dialogue, narration, sound effects, ambience and music generation/synchronization.
- Clip extension, continuation, scene transitions and timeline editing.
- Animation, realistic footage, stylized visuals and 3D/virtual-scene output.
- Long-form assembly from scenes with editable timeline, provenance and regeneration of selected shots.

A successful request must produce a real playable video artifact, persist it to Fresh-owned storage, return a durable artifact ID and metadata, and record model/version, prompt, settings, duration, dimensions, audio state and provenance. A storyboard, placeholder, mock preview, or queued job is not a completed generation.

Initial engineering slices should be staged: (1) job contract and status lifecycle; (2) artifact storage and playback; (3) short clip inference; (4) temporal/identity consistency; (5) audio synchronization; (6) multi-shot and long-form orchestration. No external AI video provider or third-party model weights may be substituted while claiming native Fresh generation.

## 4. Robotics and automatic machines

Fresh Robotics is a controlled intelligence stack for defined machine classes, not an unrestricted “connect anything and let AI control it” feature.

Target domains include:
- Educational and research robot arms and mobile robots.
- Agricultural equipment and precision-farming devices.
- Industrial and manufacturing machines.
- Drones and autonomous mobile platforms.
- Assistive and service robots.
- Smart devices, sensors, laboratory and scientific equipment.
- Vehicle research and simulation environments.

Required layers:
1. **Perception:** camera, depth, lidar, encoders, force, temperature and other authorized sensor inputs.
2. **World model:** object identity, location, geometry, motion, uncertainty and environment state.
3. **Task planner:** converts a human goal into explicit, bounded sub-tasks and preconditions.
4. **Motion/control policy:** machine-specific, rate-limited commands with validated operating envelopes.
5. **Safety supervisor:** independent constraints, collision/force/speed limits, geofencing, watchdogs and emergency stop.
6. **Operator interface:** live state, preview/simulation, clear consent, pause, cancel and manual takeover.
7. **Audit and recovery:** immutable command/event trail, fault handling, safe stop and recoverable state.

No model may directly issue unrestricted actuator commands. Begin in simulation and read-only observation. Progress to hardware-in-the-loop, then supervised low-risk movement on a named machine with a documented operating envelope. Dangerous, irreversible, public-space, vehicle, medical, or industrial actions require qualified human authorization and appropriate certified safety systems. Emergency stop and manual override must remain available independently of Fresh AI and network connectivity.

## 5. Autonomous digital systems and automation

Fresh Automation may operate computers, applications, databases, networks and connected devices only through registered tools and scoped permissions.

Every action plan must include:
- User goal and intended outcome.
- Target system and authenticated user identity.
- Exact permissions and data scope.
- Proposed actions and expected side effects.
- Risk classification and approval requirement.
- Precondition checks and dry-run where supported.
- Execution trace, verification result and audit event.
- Rollback or compensation plan where technically possible.

Never infer permission from a user's general request when the action is high impact. Never claim success from a submitted job alone; verify the target system's resulting state.

## 6. Scientific and engineering intelligence

Fresh Science should support literature discovery, evidence extraction, mathematical derivation, code-assisted computation, simulations, engineering design exploration and hypothesis generation. It must distinguish source-backed findings, calculations, assumptions, hypotheses and unverified proposals. Preserve citations, datasets, code, parameters and reproducibility metadata. High-impact scientific or engineering conclusions require independent checks and domain review.

## 7. Shared training and evaluation infrastructure

All modules use a common governed lifecycle:
1. Rights and consent review for every dataset and derivative.
2. Source, license, collection date, transformations and exclusions in a data manifest.
3. Privacy screening, deduplication, contamination checks and train/validation/test separation.
4. Reproducible tokenizer/encoder, model config, code revision, seed and training logs.
5. Checkpoint hashing and immutable artifact storage.
6. Capability-specific held-out evaluations, adversarial tests and regression suites.
7. Safety review and human sign-off for high-impact capabilities.
8. Canary deployment, monitoring, rollback and explicit promotion state.

Training completion, low loss, a registry row, a UI control, or a passing static test is never sufficient to mark a capability ready.

## 8. Runtime and integration contracts

- Fresh AI gateway remains the canonical entry for Fresh AI requests.
- Each module is invoked through a typed capability contract with authentication, authorization, quotas, timeouts, cancellation and structured errors.
- Generation jobs use explicit states: `accepted`, `queued`, `running`, `succeeded`, `failed`, `cancelled`. Only `succeeded` with a validated persisted artifact counts as completed media generation.
- Device actions use a separate command lifecycle and safety supervisor; they must never share a permissive media-generation path.
- Fresh Flow consumes video artifacts through the media library/player; Fresh Studio owns creator-facing composition and editing workflows.
- Device registry, machine capabilities, operator roles and action permissions must be explicit and user-scoped.
- Secrets remain server-side. Never accept arbitrary engine URLs, credentials, actuator endpoints or user-supplied control scripts from the browser.
- If a module is not deployed, return a truthful `training-required`, `not-configured`, or `in-development` state; do not return simulated output as a real result.

## 9. Safety, privacy and governance

- Default robotics mode is simulation or observation-only.
- Human confirmation is required before any physical actuation until a specific machine and risk tier have passed their certification gates.
- Hardware emergency stop, operator takeover, speed/force limits and watchdogs must be independent of model output.
- Never allow autonomous self-modification of production code, policies, permissions, training data or deployments.
- Self-improvement may propose experiments; a separate review process approves data, training, evaluation and promotion.
- Apply least privilege, per-user isolation, data minimization, retention controls and auditable consent.
- The existing cloud inference path is not server-blind live E2EE; do not imply otherwise.

## 10. Phased implementation plan

| Phase | Deliverable | Exit gate |
|---|---|---|
| A — Architecture | Module registry, typed contracts, status vocabulary, threat model and evaluation plan | Reviewed docs and tests; no false ready states |
| B — Video product foundation | Authenticated video job API, job lifecycle, artifact metadata/storage, playback integration | Real test artifact can be generated by a configured Fresh-owned engine and played back |
| C — Video model research | Fresh-owned temporal encoder/decoder training pipeline and datasets | Reproducible training, held-out temporal and quality evaluation |
| D — Vision/audio/spatial | Independent module pipelines and product flows | Per-modality end-to-end evaluation and privacy review |
| E — Simulation robotics | Machine profiles, simulator adapter, world state, planner, safety supervisor | Scenario suite, emergency stop, bounded actions and operator takeover pass |
| F — Supervised hardware | One explicitly named low-risk robot/device integration | Hardware-in-loop and supervised field validation approved |
| G — Science and automation | Reproducible research workflows and scoped digital execution | Evidence, permission, audit, verification and recovery tests |
| H — Cross-domain intelligence | Shared representations and coordinated planning across modules | Independent cross-domain benchmark and safety review |

## 11. Current baseline and non-claims

At the time this architecture is introduced, the repository's readiness audit reports:
- `fresh-unified-1` remains `training-required`; Run 3 is not promoted and has documented instruction-following and correctness failures.
- Native serving backend is not installed/verified.
- Vision, audio, video and broader 3D generation are not established as production capabilities by their contracts alone.
- Existing image adapter configuration is not proof of a Fresh-owned trained image generator; third-party model inference must not be represented as Fresh-owned generation.
- No physical robot or autonomous machine control is certified or production-ready.

These statuses must be updated only with links to implementation, training manifests, evaluation reports, integration tests and deployment evidence.

## 12. Definition of done

A capability is done only when its Fresh-owned model or deterministic non-model controller is identified; its runtime is deployed; permissions and safety are enforced; a real end-to-end result is independently validated; failures are truthful; and observability, rollback and regression coverage exist. Until then it remains architecture, research, contracted, or in development.
