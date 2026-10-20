# Fresh AI engine ownership and deployment

## Ownership rule

All product-facing engines belong to **Fresh AI** and are operated as part of **Fresh Web Lite**. The canonical model identity is `fresh-unified-1`; image, audio, video, vision, code, and other capabilities are modality engines under the Fresh AI control plane, not separate vendor-branded assistants.

Fresh AI owns the public request contract, user authentication, permissions, policy checks, model identity, usage/audit records, artifact persistence, and user-facing error messages. Compute workers may be deployed as separate services for resource isolation, but they remain Fresh-managed components and must accept only server-to-server requests from the Fresh application.

A third-party provider URL/token is not a client option and must never be sent to the browser. If a temporary compatible inference implementation is used during development, it is an explicitly configured execution adapter—not a change in Fresh AI ownership, model provenance, or a claim that the Fresh-trained model produced the result. The product must record the engine used.

## Engine inventory

| Engine | Owner / product | Current state | Boundary |
|---|---|---|---|
| Fresh Unified inference | Fresh AI / Fresh Web Lite | Training/backend required | `FRESH_UNIFIED_CHECKPOINT_ID` is only a checkpoint registration; native serving is still not installed. |
| Image generation | Fresh AI / Fresh Web Lite | Configuration required unless server endpoint + token are set | `fresh-image-v1`; authenticated server request, PNG signature validation, provenance, and persistence. |
| Media processing | Fresh AI / Fresh Web Lite | Separate FFmpeg worker | Transcodes existing audio/video; it does **not** generate images from text. |

The public Fresh AI status response reports only safe configuration flags and never reveals engine URLs, tokens, or secrets. “Configured” does not mean “healthy” or “production verified”; only a live authenticated generation → output validation → persistence → render smoke test can establish that.

## Required deployment sequence

1. Deploy a compatible image-inference worker as a Fresh-managed service with a real, license-checked open-weight image model and sufficient compute. Do not use the FFmpeg worker as a substitute.
2. Configure `FRESH_AI_IMAGE_ENGINE_URL` and `FRESH_AI_IMAGE_ENGINE_TOKEN` as **server-only** Vercel environment variables for the relevant deployment targets. Never use a `VITE_` prefix for the token.
3. Verify worker authentication, HTTPS, bounded execution, PNG response validation, and failure behavior.
4. Test a signed-in user request from the actual Fresh AI composer; verify the returned image is rendered and its asset/provenance is persisted in the user's Fresh AI library.
5. Keep `fresh-unified-1` marked `training-required` until the actual Fresh-trained checkpoint and native inference backend pass model-integrity and evaluation gates. An adapter must not falsely promote the Fresh model's training state.

## Acceptance checks

- Status exposes Fresh ownership and the separate state of image generation vs media processing.
- No secrets are exposed by status.
- A registered checkpoint without an installed backend remains unavailable.
- Missing or partial engine configuration produces an actionable failure.
- Image output is not marked successful until the engine returns a validated PNG.
- Engine provenance is retained on persisted artifacts.
- No claim of production readiness is made based only on static contract tests.
