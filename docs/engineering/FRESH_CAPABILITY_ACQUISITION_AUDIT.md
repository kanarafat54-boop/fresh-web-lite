# Fresh Capability Acquisition & Integration Audit

**Date:** 2026-10-24  
**Repository:** `kanarafat54-boop/fresh-web-lite`  
**Scope:** Reuse proven capabilities safely before inventing replacements.

## Engineering decision

Fresh should acquire capabilities through documented APIs, interoperable protocols, permissively licensed/open-source components, and authorized datasets where that is cheaper and more reliable than rebuilding them. Fresh must own the user experience, identity and authorization boundaries, orchestration, evidence trail, data governance, and truthful capability status. An integration is not equivalent to owning a third-party service or model.

This audit is based on repository source inspection. It is **not** a claim that every feature was browser-tested or that current production environment variables and external provider credentials were verified.

## Verified repository findings

| Area | Source evidence | What it means now | Next verification |
|---|---|---|---|
| Fresh AI capability registry | `src/core/fresh-ai/FreshAICapabilityRegistry.ts` | Capabilities have explicit `implemented`, `contracted`, or `training-required` status. Voice, vision, data, code, projects, knowledge, skills, apps, work, tasks, library, automation and 3D/media are currently contracted in this registry. | Confirm each status against a real callable execution path and a successful test; do not upgrade labels just because a UI exists. |
| Fresh AI execution gate | `src/core/fresh-ai/FreshAICapabilityRuntime.ts`, `FreshAIIntelligenceGateway.ts` | Runtime resolutions are distinct from product contracts; execute requests fail closed when requested capabilities are not executable. | Exercise each capability with authenticated, unauthenticated, approval-required, unknown and unavailable cases. |
| Fresh Unified model | `src/core/fresh-ai/FreshUnifiedModelCore.ts` | The canonical model identity is `fresh-unified-1`, while weights are explicitly `training-required`. A model identity/contract is not proof of a trained, serving foundation model. | Record checkpoint provenance, reproducible training/evaluation, serving health and held-out task results before claiming native inference. |
| Image generation | `src/core/fresh-ai/FreshAIServerServices.ts` | A server-configured image-engine adapter exists; it validates authenticated configuration, response type and PNG bytes. Without a usable configured engine and validated native inference, generation fails explicitly. | In a safe test environment, verify credentials are server-only, engine health, real PNG output, persistence, signed URL authorization, timeout and failure behavior. |
| Search/research | `api/ai/stream.ts` and existing search-related routes/scripts | Fresh AI has a Tavily-backed research path when `TAVILY_API_KEY` is present, alongside Fresh platform knowledge retrieval. Missing credentials or provider errors can result in no external results. | Verify provider availability, source URL validation, rate limits, freshness, citation fidelity, timeout and no-key fallback. Keep provider keys server-side. |
| Media processing | `src/core/fresh-ai/FreshAIServerServices.ts` and existing media-worker contract scripts | The repository distinguishes a media-processing worker from a text-to-image inference engine. These are different capabilities. | Run real upload → process → inspect output → persist → retrieve tests; do not equate worker health with media-generation capability. |
| Ecosystem inventory | `src/core/platform/freshEcosystemCatalog.ts` | The catalog explicitly describes lifecycle states; entries can be planned, discovered, wired, verified or blocked. | Treat `verified` as earned only after real functional and security tests. |
| Existing test harness | `package.json` | Dedicated contract checks exist for Fresh AI, platform parity, security, media, training and other domains. | Run the relevant scripts in CI against the exact proposed commit and fix failures rather than relying on static assertions alone. |

## Acquisition backlog (priority order)

### P0 — Establish a truthful capability baseline
1. Generate a machine-readable report from the canonical registry and runtime resolver: capability ID, declared status, executable status, reason, owner, dependencies and test evidence.
2. Compare every registry entry with actual server/API handlers and user-facing entry points. Flag UI-only, simulated, unconfigured and untested paths separately.
3. Verify current production deployment commit and readiness before merging additional features. A preview deployment marked READY is not proof that production uses that commit.
4. Preserve fail-closed execution, per-user authorization, approval gates, evidence provenance and honest error messages.

**Acceptance:** no capability is reported as available solely because it is named in a registry, UI, model card or roadmap.

### P1 — Activate the highest-value existing integrations
1. **Search and research:** validate Fresh's existing search/research paths first; add a provider adapter interface and a second provider only after comparing terms, cost, data handling, coverage and reliability. Normalize source metadata and preserve citations.
2. **Fresh AI model/runtime:** test the current native path; keep optional model providers behind explicit server-side adapters. Never present an external model's inference as proof that Fresh's own weights are trained.
3. **Files and knowledge:** verify authenticated upload, per-user ownership, signed URL expiry, content limits, file-type validation, retrieval and deletion. Do not expose service-role credentials to clients.
4. **Media:** connect the existing FFmpeg worker to real Studio workflows; separately track image/video/audio generation engines and their readiness.
5. **Fresh ID and communications:** validate signup, recovery, session revocation, messaging authorization, realtime delivery and RLS with two distinct users.

**Acceptance:** each integration has contract tests plus at least one real end-to-end test; provider failures degrade safely and remain visible.

### P2 — Expand through reusable adapters
For each requested new capability, prefer this order:
1. Existing Fresh-owned implementation that passes tests.
2. Existing configured service/API with acceptable terms and cost.
3. Maintained open-source implementation with a compatible license and operational footprint.
4. Authorized public or licensed dataset, with provenance and usage restrictions recorded.
5. New implementation only when the options above are unsuitable.

Every adapter must define: input/output schema, authentication, permission model, timeout, retry policy, rate/cost limit, logging/redaction, provenance, failure modes, test fixture and a provider-independent interface where practical.

### P3 — Compound capabilities into Fresh-native workflows
After individual capabilities pass, connect them across Fresh ID, Fresh AI, search, files, Fresh Flow, Studio and communications. Examples: research → cited brief → saved file; media upload → processing → accessible preview → publish; user-authorized memory → task plan → approval → execution → verifiable result.

**Acceptance:** test the complete user journey, including cancellation, retry, poor network, expired session, unauthorized access and partial failure.

## Non-negotiable integration guardrails

- Never copy proprietary code, private data, branding or restricted datasets without permission.
- Do not scrape or bulk-ingest services contrary to their terms or privacy commitments.
- Keep secrets server-side; use least-privilege keys and scoped user tokens.
- Validate external responses as untrusted input. Apply timeouts, response-size limits and safe URL handling.
- Do not silently fall back to an unrelated provider or fabricate search results, citations, generated files, training progress or success states.
- Make provider use, costs, data sharing and user approval clear when material.
- Keep external integrations replaceable; Fresh should own orchestration and the coherent product experience without misrepresenting third-party capabilities as proprietary technology.

## First implementation slice

Start with a capability-baseline report generated from the canonical Fresh AI registry/runtime and checked in CI. Then use its findings to activate the highest-value existing integration rather than adding another disconnected feature. The initial report must distinguish **declared**, **executable**, **configured**, **verified**, and **production-verified** states; these are separate facts.

## Definition of done

- [ ] Audit is reviewed against current `main` and the deployment commit.
- [ ] Capability inventory is generated from source, not hand-maintained claims.
- [ ] Each status has a test/evidence reference or an explicit missing-evidence reason.
- [ ] Required checks pass on the exact candidate commit.
- [ ] Production deployment is READY and the expected commit is confirmed before calling the change complete.
