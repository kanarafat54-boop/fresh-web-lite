# Fresh AI engine ownership and deployment

## Ownership rule

All product-facing engines belong to **Fresh AI** and are operated as part of **Fresh Web Lite**. The canonical model identity is `fresh-unified-1`; image, audio, video, vision, code, and other capabilities are modality engines under the Fresh AI control plane, not separate vendor-branded assistants.

Fresh AI owns the public request contract, user authentication, permissions, policy checks, model identity, usage/audit records, artifact persistence, and user-facing error messages. Compute workers may be deployed as separate services for resource isolation, but they remain Fresh-managed components and must accept only server-to-server requests from the Fresh application.

Fresh image generation follows the Fresh-owned-only strategy: do not route prompts to a third-party inference API or substitute downloaded open-weight model weights. A separately hosted compute worker is acceptable only when it runs the validated Fresh-trained image model and remains under Fresh's operational control. The product must record engine and checkpoint provenance.

## Engine inventory

| Engine | Owner / product | Current state | Boundary |
|---|---|---|---|
| Fresh Unified inference | Fresh AI / Fresh Web Lite | Training/backend required | `FRESH_UNIFIED_CHECKPOINT_ID` is only a checkpoint registration; native serving is still not installed. |
| Image generation | Fresh AI / Fresh Web Lite | Unavailable until native Fresh image model and serving runtime pass gates | `fresh-image-v1`; authenticated request, PNG validation, provenance, and persistence. A configured endpoint is not proof of readiness. |
| Media processing | Fresh AI / Fresh Web Lite | Separate FFmpeg worker | Transcodes existing audio/video; it does **not** generate images from text. |

The public Fresh AI status response reports only safe configuration flags and never reveals engine URLs, tokens, or secrets. “Configured” does not mean “healthy” or “production verified”; only a live authenticated generation → output validation → persistence → render smoke test can establish that. See `FRESH_AI_NATIVE_IMAGE_MODEL_PLAN.md` for the no-third-party, free-hosting-only decision and staged gates.

## Required deployment sequence

1. Implement and version a separate native image-generation architecture; the current decoder-only language-model spec is not an image model.
2. Train and validate image-generation weights from authorized data without silently loading pretrained third-party/open-weight weights. Keep experiments bounded by available free compute; do not create paid resources.
3. Promote only after checkpoint integrity, held-out quality/safety evaluation, and data-provenance gates pass.
4. Deploy the promoted Fresh-trained image model in a private Fresh-managed worker. Configure any server-only endpoint/token only for that native worker; never use a `VITE_` prefix for tokens.
5. Verify authentication, HTTPS, bounded execution, PNG validation, authorized persistence, provenance, and the actual Fresh AI composer end to end.
6. Keep `fresh-unified-1` marked `training-required` until its relevant native backend and model artifacts pass their integrity and evaluation gates. An adapter must not falsely promote the model's training state.

## Acceptance checks

- Status exposes Fresh ownership and the separate state of image generation vs media processing.
- No secrets are exposed by status.
- A registered checkpoint without an installed backend remains unavailable.
- Missing or partial engine configuration produces an actionable failure.
- Image output is not marked successful until the engine returns a validated PNG.
- Engine provenance is retained on persisted artifacts.
- No claim of production readiness is made based only on static contract tests.
