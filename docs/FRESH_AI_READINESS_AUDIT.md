# Fresh AI Readiness Audit

**Purpose:** keep Fresh AI's UI, runtime capabilities, and model training status separate. A route, button, registry entry, or passing static contract test is not proof that a capability is production-ready.

## Current product state

### Implemented code foundations — end-to-end production verification still required

- **One entry surface:** `FreshAIUnified` is the canonical UI for `/ai`; the global entry is on-demand and dismissible.
- **Request boundaries:** `/api/ai/ask` and `/api/ai/stream` route requests through the Fresh AI intelligence gateway.
- **Context and orchestration:** the gateway assembles workspace context, intent, evidence, capability resolutions, planning, verification, and governance decisions.
- **Conversation persistence boundary:** conversation APIs and a ledger path exist; live persistence depends on valid server configuration and must be smoke-tested.
- **Files and media boundaries:** authenticated file upload and Fresh-owned media persistence/image-generation contracts exist; each engine must be tested with its required configuration.
- **Native dimensional engines:** 1D–11D engine contracts are registered. Their presence does not mean the trained foundation model supports every modality.
- **Governance and truth:** approval checks and fail-closed execution boundaries exist; real tool execution, audit coverage, and rollback/compensation need capability-by-capability verification.
- **Vault:** client-side sealing for stored conversation turns exists. This is encryption at rest, not server-blind live inference.

## Capability readiness

The registry's `implemented` status means a Fresh-owned code boundary is present. It is **not** a blanket statement that production dependencies are configured or the deployed end-to-end flow has passed.

| Capability group | Registry status | Current treatment |
|---|---|---|
| Conversation | Implemented | Available through the unified composer; production smoke test still required |
| Search and Research | Implemented | Keep available, but verify configured retrieval, current sources, provenance, and truthful degraded behavior |
| Create | Implemented | Available only through supported generation boundaries; report engine/configuration failures clearly |
| Files | Implemented | Authenticated upload boundary exists; vision/camera understanding is not implied |
| Memory, Trust, Safety | Implemented | Verify persistence, evidence, approval, and audit behavior end to end |
| Voice, Vision/Camera | Contracted | Not yet a complete executable capability |
| Data, Code, Projects, Knowledge, Skills | Contracted | Show as in development, not as working execution controls |
| Apps, Work, Tasks, Library, Automations | Contracted | Require real connector/tool boundaries, permissions, audit, and verification |
| 3D / broader media | Contracted | Native dimensional contracts do not establish complete media-generation readiness |

The unified UI must read these states from the canonical capability registry. Contracted capabilities should be visibly marked **In development** and disabled until a real runtime boundary is available.

## Optional image inference adapter — implemented contract, deployment configuration required

Fresh AI now has a Fresh-owned adapter boundary for a separately deployed image inference engine. The adapter is opt-in and uses the same authenticated Fresh request path, Fresh model identity, artifact persistence, and provenance contract.

Server-only Vercel environment variables:

- `FRESH_AI_IMAGE_ENGINE_URL` — HTTPS URL of an engine implementing the `fresh-image-v1` request/response contract.
- `FRESH_AI_IMAGE_ENGINE_TOKEN` — server-to-server bearer token for that engine.

The engine accepts JSON with `contract`, `modelId`, `kind`, `prompt`, `size`, and `quality`; it returns `{ "b64Json": "<base64 PNG>", "mimeType": "image/png" }`. The URL and token are never accepted from the browser. Remote HTTPS, redirect rejection, a 45-second timeout, payload bounds, PNG validation, and persisted engine provenance are enforced by the Fresh server boundary.

If the engine URL is not configured, Fresh AI tries its native generation runtime. That runtime currently truthfully reports `training-required` until actual Fresh-trained image weights and an inference backend are registered and verified. Configuring the adapter makes a real external inference engine available to Fresh AI; it does **not** mean such an engine is already deployed or that image generation has passed production smoke tests.

Regression contract: `npm run test:fresh-ai-image-engine`. This static contract test is not a substitute for a configured-engine integration test, authenticated image-generation test, storage test, or deployed production smoke test.

## Model training: current facts

- Model identity: `fresh-unified-1`.
- The starter run `fresh-unified-1-starter-run1` completed 40 CPU optimizer steps on 46 synthetic authorized examples.
- The starter architecture was deliberately reduced for a pipeline smoke test: hidden size 128, 2 layers, feed-forward size 256, context 256.
- The reported final loss was approximately 107.75. This is not evidence of useful production intelligence.
- The repository still declares `weightsStatus: training-required`.
- `inferFreshUnified` currently returns `training-required`; even a registered checkpoint is not served because the native neural backend is not installed.

### Gates before model promotion

1. Prepare a substantially larger, lawful, provenance-tracked corpus with verified training and derivative-model permissions.
2. Train the versioned Fresh tokenizer on authorized data and record its hash.
3. Run full-spec foundation training with suitable GPU compute; the v1 target is vocabulary 32,000, context 2,048, hidden size 512, 8 transformer layers, 8 attention heads, and feed-forward size 2,048.
4. Complete held-out capability evaluations, truth/grounding tests, safety review, robustness and regression evaluation.
5. Install and verify the native serving backend; register and hash the actual checkpoint and manifest.
6. Promote only after provenance, integrity, evaluation, and serving gates pass. Do not set the model to ready merely because training completed.
7. Train multimodal encoders/decoders and action heads as later stages; text training alone does not complete vision, audio, video, 3D, or tool-use intelligence.

## Privacy boundary

The vault can seal stored turns, but the live `/api/ai/ask` inference path currently receives plaintext. Server-blind live end-to-end encryption remains blocked until an on-device inference path is implemented and verified. The UI and documentation must not imply otherwise.

## Engineering sequence

1. **Unify the surface and remove persistent UI takeover.** Route `/ai` through the canonical component, keep the global entry on-demand, and prevent unsupported modes from appearing executable.
2. **Prove the core request loop.** Test chat, cancellation, errors, session restore, conversation persistence, and context preservation with configured dependencies. Use existing no-cost CI and local/preview testing; do not create a paid staging resource.
3. **Complete Research + Trust.** Verify source retrieval, citations, provenance, uncertainty, contradictions, and honest no-source behavior.
4. **Complete Files + Vision.** Test upload, access control, document parsing, image understanding, and camera entry points separately.
5. **Complete Create.** Test image generation and persistence first, then audio/video/3D only where real engines exist.
6. **Complete governed work.** Connect executable tools only with explicit permissions, approvals, audit events, verification, and rollback/compensation.
7. **Train and serve the model.** Follow the training gates above; don't use training to conceal missing product contracts.
8. **Verify the deployed product.** Run mobile/accessibility checks, production smoke tests, and capability-specific regressions before marking any capability done.

## Definition of done

A capability is complete only when its implementation, permissions, configured dependencies, end-to-end test, observability, verification, and truthful failure behavior are demonstrated. The overall product has no single trustworthy completion percentage.
