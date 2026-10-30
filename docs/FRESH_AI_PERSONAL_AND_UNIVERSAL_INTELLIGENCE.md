# Fresh AI — Personal and Universal Intelligence Contract

**Mission:** Build one Fresh-owned intelligence platform with two inseparable operating modes: a personal intelligence for every person and a universal intelligence layer for digital and physical systems.

**Canonical identity:** `fresh-unified-1`, coordinated by Fresh Astra. Astra is an orchestration and safety subsystem, not a second foundation model.

## Product promise

Fresh AI must progress from answering a request to helping complete a verified outcome. It may perceive, reason, research, design, create, simulate, build, coordinate and—only through explicitly authorized, tested integrations—act. It must never claim that a plan was executed when no executor ran and verified the result.

## Two operating modes

### Personal intelligence

- A user-controlled assistant with transparent, scoped memory and conversation continuity.
- Research, learning, writing, accessibility, planning and creative support.
- Personal workspace for files, projects, goals and authorized connected apps.
- User-controlled privacy, consent, export and deletion workflows.
- Clear explanations of uncertainty, sources, capability readiness and actions awaiting approval.

### Universal infrastructure

- A reusable intelligence API and agent runtime for Fresh products and authorized third-party systems.
- Specialist engines for language, vision, audio, video, spatial reasoning, research, software engineering, automation, robotics, science, world models, space, energy, economy and learning.
- Typed integrations for applications, services, sensors, simulations and machines.
- Tenant isolation, least-privilege credentials, audit trails, rate limits, revocation and explicit capability grants.

## Astra orchestration loop

`intent → identity + consent → capability discovery → evidence/observations → reasoning → bounded plan → policy evaluation → approval (when required) → registered executor → independent verification → audit + learning candidate`

Astra must preserve provenance and uncertainty. Observations, model inferences, retrieved claims and verified outcomes are different data classes. No model-generated statement becomes ground truth merely because it is confident.

## Capability maturity states

- **available:** the end-to-end path has passing automated tests and a verified operational integration.
- **contracted:** typed interfaces and safety boundaries exist, but the full capability is not proven.
- **training-required:** the Fresh-owned model/checkpoint is not ready for production inference.
- **in-development:** design or partial implementation exists, but end-to-end behavior is not established.

Configuration alone never means ready. A successful mock test never proves a real model or physical device works.

## Universal safety invariants

1. Default to observe, plan and verify; execution is opt-in and capability-scoped.
2. Physical actuation remains disabled until device pairing, revocation, signed commands, local interlocks, independent emergency stop, simulation, hardware-in-loop testing and a reviewed device-class safety case are complete.
3. Payments, purchases, publication, deletion, permission changes and other high-impact actions require explicit, contextual human approval.
4. Never accept arbitrary browser-provided provider URLs, tokens or device commands as trusted execution inputs.
5. Every executor must be registered, authenticated, least-privileged, time-bounded, idempotent where possible and independently verifiable.
6. Learning from user data requires consent, provenance, data minimisation and an evaluation/promotion gate; user conversations are not silently promoted into training data.
7. Keep a kill switch, cancellation path, audit history and rollback/recovery plan for every execution integration.

## Delivery sequence

1. **Foundation:** integrate Astra coordinator with the existing observation, policy, vision-adapter and software-in-the-loop simulator contracts; expose honest readiness in the gateway and UI.
2. **Multimodal:** implement audio session contracts, temporal video sampling/event contracts, native image/audio/video engines and evaluation sets. Do not represent untrained modalities as available.
3. **Personal workbench:** persistent projects, scoped memory, goal plans, explainable approvals and connected-app permissions.
4. **Universal agent runtime:** typed tool registry, tenant-scoped credentials, durable jobs, retries, cancellation, audit and independent result verification.
5. **World and science:** validated digital-twin interfaces, reproducible experiment design, simulation provenance and domain-expert review.
6. **Embodiment:** device registry, pairing/revocation, simulator scenarios, fault injection, hardware-in-loop and per-device safety certification before any physical actuation.
7. **Continuous improvement:** consented feedback, curated learning candidates, held-out evaluations, regression testing and signed model promotion/rollback.

## First integration acceptance criteria

- Gateway response includes Astra mission, both operating modes, requested specialist domains, real modality runtime readiness and explicit simulation maturity.
- A request for a modality that is not deployed returns a truthful unavailable/contracted state.
- Image observations continue through the existing authenticated Fresh ID and private asset ownership route.
- The grid simulator is clearly labelled software-in-the-loop and cannot control physical hardware.
- High-impact and physical actions remain blocked or approval-required; no dispatch occurs from Astra policy evaluation.
- Unit/contract tests, typecheck, lint and production build pass before merge.
