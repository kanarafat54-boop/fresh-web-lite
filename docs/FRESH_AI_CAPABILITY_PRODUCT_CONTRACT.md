# Fresh AI Capability & Product Contract (#TRUEMODE)

## Purpose
This is the canonical product-level contract for Fresh AI. It defines the complete user-facing capability surface, entry points, orchestration responsibilities, permissions, memory, artifacts and verification requirements before model training expands.

Fresh AI remains **one sovereign model identity**: `fresh-unified-1`. Modes, skills and tools are capabilities of that identity, not separate vendor brains.

## Product surface

The primary Fresh AI composer stays intentionally simple:

`＋ Ask Fresh` · `🎙 Voice` · `Search` · `Create` · `Research` · `Work` · `Files` · `Camera`

A `More` surface exposes deeper capabilities without overcrowding the primary experience:

`Code` · `Data` · `Projects` · `Tasks` · `Knowledge` · `Library` · `Skills` · `Apps` · `Automations` · `3D` · `Video` · `Settings`

The exact visual design remains owned by the existing Fresh design system. This contract defines capability entry points, not a mandate to redesign the current UI.

## Capability matrix

| Domain | User capability | Primary entry | Required contract |
|---|---|---|---|
| Conversation | Ask, explain, write, transform, translate | Ask Fresh | intent, context, answer, uncertainty |
| Voice | live conversation, interruption, spoken answers | Voice | audio input/output, consent, session state |
| Vision | understand images, camera, documents and screens | Files / Camera | visual context, OCR/analysis, provenance |
| Search | current web/platform retrieval | Search | sources, freshness, provenance, truth state |
| Research | multi-step investigation and synthesis | Research | plan, sources, evidence, citations, verification |
| Creation | image, avatar, video, audio, 3D and document creation | Create | prompt/context, generation job, artifact, provenance |
| Files | inspect, compare, transform and extract from files | Files | file identity, permissions, parser/tool result |
| Data | analyze datasets, statistics, charts and simulations | Data | dataset lineage, computation result, validation |
| Code | generate, run, test, debug, review and explain code | Code | repository/workspace, execution permission, test evidence |
| Projects | persistent chats, files, instructions, memory and artifacts | Projects | project scope, memory scope, source lineage |
| Knowledge | user-controlled durable knowledge and relationships | Knowledge | provenance, temporal state, correction/forget |
| Memory | personal, project, conversation, preference and task memory | Memory | consent, provenance, correction, retention |
| Skills | reusable capability bundles | Skills | skill contract, tools, permissions, evaluation |
| Apps | controlled external/platform integrations | Apps | connector identity, scopes, approvals, audit |
| Work | objective-driven multi-step execution | Work | plan, checkpoints, approvals, execution, rollback |
| Tasks | scheduled or conditional work | Tasks | trigger, schedule, permissions, result, notification |
| Library | generated and uploaded artifacts | Library | ownership, provenance, retention, access |
| Automation | recurring workflows and monitoring | Automations | trigger, action graph, guardrails, observability |
| 3D / Media | multimodal creation and transformation | Create / More | artifact contract, renderer/engine evidence |
| Trust | truth, evidence, confidence and conflicts | contextual | evidence, provenance, temporal truth, decision |
| Safety | privacy, permissions, confirmations and governance | Settings | policy decision, authorization, audit |

## Universal execution contract

Every substantive request follows the same conceptual path:

`goal → intent → context → evidence → plan → skill composition → tool/agent execution → verification → truth decision → authorized action → result → memory update → explanation`

Not every request needs every stage visibly. The runtime may short-circuit simple requests while preserving the same contracts.

## One model, many modes

`fresh-unified-1` supports capability modes such as:

- Fast — low-latency everyday assistance.
- Think — deeper reasoning and structured analysis.
- Deep Think — complex planning and verification.
- Research — evidence-first investigation.
- Create — multimodal generation and transformation.
- Work — long-running, permissioned execution.

Modes are routing/runtime policies over the same Fresh model identity. They must not silently create provider-specific model identities.

## Memory contract

Fresh AI may maintain distinct memory classes under one memory fabric:

- conversation
- personal
- preference
- project
- task/working
- semantic knowledge
- episodic/event
- media/context
- skill/learning
- temporal/provenance

Memory writes require an explicit policy decision. Sensitive or durable memory must be user-controlled, traceable and correctable. Forgetting must remove the relevant durable representation according to the platform retention contract rather than merely hiding it from the UI.

## Tool and agent contract

Tools are capability executors. Agents are operational managers. Neither is a second intelligence identity.

Every tool/action declares:

`capability → inputs → required permissions → risk class → execution boundary → evidence/result → verification → rollback/compensation`

Sensitive actions require approval before execution. Financial, destructive, identity, publication and security-sensitive operations remain behind explicit safety boundaries.

## Artifact contract

Fresh AI can create or transform:

- text and documents
- spreadsheets and datasets
- presentations
- code and project files
- images and avatars
- audio
- video
- 3D assets/scenes
- research reports
- diagrams and structured knowledge

Every persistent artifact needs an owner, provenance, capability version and storage/reference boundary. A generated artifact must never be represented as successfully generated if its required engine was unavailable.

## Truth and explanation contract

For material claims, Fresh AI preserves the states:

`KNOWN · SUPPORTED · PROBABLE · UNCERTAIN · CONTRADICTED · UNKNOWN · BLOCKED`

Explanations expose conclusions, evidence, uncertainty, decisions and action status. They do **not** expose private chain-of-thought or proprietary implementation details.

## Evaluation gate

A capability is not considered production-complete merely because a button exists. Each capability requires:

1. typed contract;
2. real implementation boundary;
3. permission boundary;
4. unit tests;
5. integration tests;
6. end-to-end coverage where user-visible;
7. adversarial/safety tests where applicable;
8. regression cases;
9. observability and failure reporting;
10. truthful degraded behavior when dependencies are unavailable.

## Training gate

Training may expand the intelligence of `fresh-unified-1`, but training must not be used to define missing product contracts. The capability surface, tool boundaries, memory model, truth system, permissions and evaluation harness must exist first.

The current repository explicitly marks the Fresh checkpoint as `training-required`; this contract does not claim that trained foundation-model weights already exist.

## Non-negotiables

- No hidden provider API dependency in Fresh AI core.
- No fake buttons that imply unsupported execution.
- No fabricated search, computation, generation or action results.
- No duplicate reasoning/memory systems inside individual agents.
- No destructive action without authorization.
- No silent deletion of conflicting evidence.
- No exposing secrets, private architecture or chain-of-thought to end users.
- Preserve existing working product behavior while migrating to canonical contracts.
