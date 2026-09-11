# Fresh AI Runtime Roadmap (#TRUEMODE)

## Canonical product contract

Fresh AI is one sovereign model identity, `fresh-unified-1`, with a canonical capability registry and product contract. The product contract is defined in `docs/FRESH_AI_CAPABILITY_PRODUCT_CONTRACT.md` and the runtime registry in `src/core/fresh-ai/FreshAICapabilityRegistry.ts`.

The runtime must grow capabilities without turning them into separate provider-shaped brains.

## Current foundation

1. Canonical backend — `/api/ai/ask` remains the primary Fresh AI request boundary.
2. Unified UI — `FreshAIUnified` is the application-level Fresh AI surface.
3. Sovereign model boundary — `fresh-unified-1` is provider-independent and explicitly does not require an external AI provider for its core contract.
4. Native generation boundary — image/avatar creation is routed through Fresh-owned generation contracts; the repository does not claim trained foundation-model weights where they do not exist.
5. Persistence — Fresh AI state/events use the existing Supabase-backed persistence boundaries.
6. Verification — Fresh AI has integrity checks for the unified model, native generation and capability contracts.

## Product surface to implement progressively

Primary entry points:

`Ask Fresh` · `Voice` · `Search` · `Create` · `Research` · `Work` · `Files` · `Camera`

Secondary capabilities:

`Code` · `Data` · `Projects` · `Tasks` · `Knowledge` · `Library` · `Skills` · `Apps` · `Automations` · `3D` · `Video` · `Settings`

These are capability entry points, not permission to display fake controls. A control becomes user-visible only when its implementation boundary and truthful degraded state are ready.

## Runtime layers

1. Intent and context assembly.
2. Memory and knowledge retrieval.
3. Evidence and truth decision.
4. Skill discovery and composition.
5. Plan generation and checkpoints.
6. Tool and agent execution behind permissions.
7. Verification and result validation.
8. Artifact persistence and provenance.
9. Explanation without private chain-of-thought.
10. Memory update from authorized, verified outcomes.
11. Observability, evaluation and regression recording.

## Capability expansion order

1. Stabilize capability registry and contracts.
2. Complete universal context, intent and evidence structures.
3. Complete truth decision integration.
4. Complete memory/provenance controls.
5. Build the Skill Fabric.
6. Connect existing agents to shared Fresh AI contracts.
7. Complete Search + Research + citations.
8. Complete Files + Vision + Camera.
9. Complete Create across image/avatar/video/audio/3D with real engine boundaries.
10. Complete Code + Data + project workspace execution.
11. Complete Work + approvals + rollback + verification.
12. Complete Tasks + Automations + notifications.
13. Complete Apps/connectors with explicit scopes and audit trails.
14. Complete evaluation, safety and production observability across every capability.
15. Expand the trained `fresh-unified-1` checkpoint only after these contracts are stable.

## Training gate

Training is downstream of the product/runtime contract. The current model boundary intentionally reports `training-required` for the Fresh checkpoint. No document or UI may imply that a trained foundation-model checkpoint exists until an actual checkpoint is registered, loaded and verified.

## Provider rule

External model providers may exist only as explicit optional tool/compute adapters. They must not be required for Fresh AI core boot, reasoning, planning, memory, truth decisions, capability resolution or product identity. Provider-specific calls must never be hidden inside agents or product features.

## Definition of production-complete

A capability is complete only when its typed contract, implementation, permissions, verification, tests, observability and truthful failure/degraded behavior are present. A button alone is not an implementation.
