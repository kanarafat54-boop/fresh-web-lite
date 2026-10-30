# Fresh AI Astra — Multimodal Perception & Embodied Intelligence

**Status:** Contracted foundation; inference engines and device execution are not production-ready.

## Product decision

Astra is a subsystem of the single Fresh AI identity, `fresh-unified-1`. It is not a second model, provider identity, or independent chatbot. Fresh AI owns intent, reasoning, memory, truth decisions, policy and verification; Astra provides the modality-aware perception and world/device interaction contracts.

## Capability scope

- **Perception:** user-provided images, camera frames, audio, video, spatial data and consented device observations.
- **Understanding:** scene/entity interpretation, speech and sound understanding, temporal video events, spatial relationships and uncertainty reporting.
- **World context:** time-stamped observations with source, consent, confidence and provenance; never treat an inference as an observed fact.
- **Planning:** convert an approved user goal into typed, bounded action proposals with expiry and idempotency.
- **Creation:** coordinate with Fresh AI's existing Create/media contracts for image, audio, video and 3D generation; Astra does not claim those engines are installed.
- **Embodiment:** future paired sensors, robots, appliances, vehicles and other machines through a dedicated device gateway—not direct browser or model-to-actuator calls.

## Runtime flow

`user intent → consent + identity → observations → world state + uncertainty → Fresh AI reasoning → bounded plan → policy decision → human approval (when required) → verified executor → independent result verification → audit`

Astra observations must retain modality, capture time, source and consent. The first runtime now validates those fields, rejects unsafe payload references and implausible future timestamps, and creates a provenance-preserving world-state envelope. It explicitly reports inference as unavailable and never fabricates scene entities. Unsupported or unavailable modality engines return a truthful unavailable state; text-only model weights do not imply vision, audio or video understanding.

## Safety boundary

The initial implementation deliberately does not dispatch device commands. Physical actions remain blocked until all of the following exist and are independently verified:

1. Authenticated device registry, pairing, revocation and per-device capability grants.
2. Signed, typed commands with expiry, replay protection, idempotency and rate limits.
3. Local hardware interlocks, watchdogs and emergency stop independent of cloud AI.
4. Simulation with deterministic scenarios, measured outcomes, fault injection and safety constraints.
5. Hardware-in-the-loop testing and a reviewed safety case for each device class.
6. Human confirmation proportional to risk, audit events, cancellation and recovery.
7. Verified gateway integration and end-to-end tests on the actual hardware.

Critical-risk actions are blocked. The policy contract can classify a proposal but never dispatches it; an `allow` result is not evidence that an action occurred.

## Capability maturity

| Area | Current state |
|---|---|
| Astra subsystem identity and typed contracts | Contracted |
| Consent/provenance observation validation | Implemented in contract and runtime; executable safety tests added |
| Observation intake + world-state envelope | Implemented; preserves source metadata and explicit uncertainty, but performs no inference |
| Live image/audio/video/spatial inference | Not yet integrated |
| Real-time perception and world model | Not yet integrated |
| Simulation with measured physics | Not verified; existing simulation placeholder must not be trusted |
| Device pairing and command gateway | Not implemented |
| Physical robotics / machine control | Blocked by design |
| Fresh-owned multimodal generation | Uses existing Fresh Create contracts; each engine remains separately gated |
| Fresh foundation weights | `fresh-unified-1` remains training-required |

## Next engineering gates

1. Register and deploy a Fresh-owned vision inference engine, then connect user-camera and uploaded-image paths with authenticated file access, consent, provenance, and end-to-end evaluation.
2. Add audio session and speech perception/output contracts, then connect a real audio engine.
3. Add video temporal sampling/event contracts and real video understanding/generation jobs.
4. Replace placeholder simulation success with deterministic state transitions, measurable metrics and failure cases.
5. Implement device registry/gateway only after pairing, revocation, command signing and local safety interlocks are ready.
6. Train and evaluate Fresh-owned multimodal encoders/decoders and action heads; do not promote text-only weights as multimodal intelligence.

Astra expands what Fresh AI is designed to understand and coordinate. It does not change the truth rule: architecture, registration or a passing contract test is not proof of a working engine or physical capability.
