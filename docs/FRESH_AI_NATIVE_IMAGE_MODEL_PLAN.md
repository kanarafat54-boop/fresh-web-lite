# Fresh-owned native image generation plan

## Decision

Fresh AI image generation must use a model trained and operated for Fresh. Do not route image prompts to a third-party inference API or substitute a downloaded open-weight model. Do not incur hosting or compute charges. Keep the feature unavailable until the native path passes the acceptance gates below.

The existing `fresh-unified-1` language-model checkpoint is not an image model. Its starter run used 46 synthetic examples, a reduced CPU architecture, and 40 optimizer steps; it is a pipeline smoke test, not production training. Registering that checkpoint cannot enable image generation.

## Architecture boundary

The image-generation path must be a first-party capability under the Fresh AI control plane:

1. **Prompt and policy boundary** — Fresh AI validates the signed-in user, prompt limits, safety policy, request quota, and request ID.
2. **Native image model** — a documented, reproducible architecture trained for image synthesis. Its text-conditioning component, image decoder/representation, and denoising or autoregressive image-generation components must have clear provenance. Do not silently load pretrained third-party weights.
3. **Model artifact manifest** — immutable model/version ID, architecture/spec hash, training-data manifest hash, tokenizer/conditioning version, checkpoint digest, training run, evaluation results, and explicit promotion decision.
4. **Private serving runtime** — loads only a promoted, integrity-checked Fresh checkpoint; requires server-to-server authentication; enforces request, memory, compute, and output-size limits; does not expose raw exceptions or prompts in logs.
5. **Fresh result path** — validates the returned PNG signature and image dimensions, persists the artifact through Fresh's existing authorization boundary, records model/engine provenance, and renders the saved result in the user's Fresh AI workspace.

The existing FFmpeg media worker is for processing existing media. It is not an image-generation backend and must not be represented as one.

## Staged implementation

### Stage 0 — honest readiness (current)

- Keep `fresh-unified-1` at `training-required`.
- Report the image engine as unavailable unless a genuine native backend is installed and validated.
- Do not report a successful generation before a valid PNG is returned, persisted, and rendered.
- Keep credentials server-only. A checkpoint ID or configured URL alone is not a readiness signal.

### Stage 1 — native research prototype (code scaffold added; execution not yet verified)

- `training/fresh_image_model_spec.json` defines a separate experimental model identity.
- `training/datasets/fresh-image-dataset-manifest.schema.json` defines the authorized caption/image record format and provenance fields.
- `training/fresh_image_research.py` implements a small 16×16 RGB caption-conditioned pixel-bin model, initialized from random weights and trained only from a local reviewed dataset. It validates asset hashes and requires approved dataset rights review plus cleared personal-data review. Sampling verifies the written PNG.
- Install the declared training dependencies in an existing free CPU environment, create a reviewed manifest and local dataset, run `python training/fresh_image_research.py train ...`, then `python training/fresh_image_research.py sample ...`. No dataset is bundled and the script has not yet been executed end to end in this repository.
- This baseline is intentionally very low-resolution and experimental; it is not expected to create polished images. Do not expose it as production generation or use its existence as evidence that image generation is operational.

### Stage 2 — quality and safety gates

- Verify training-data authorization and remove secrets/personal data from datasets.
- Run held-out prompt/image evaluation, memorization checks, safety tests, deterministic smoke tests, and output corruption tests.
- Record checkpoint hashes and all evaluation evidence; reject a run that lacks any required evidence.
- Promote only after explicit review; never edit a manifest to bypass promotion checks.

### Stage 3 — private native serving

- Load only the promoted Fresh image checkpoint and matching tokenizer/conditioning artifacts.
- Authenticate service-to-service requests, use TLS, cap prompt and image dimensions, apply timeouts and concurrency limits, and avoid logging prompt contents.
- Test the full signed-in flow: request → inference → PNG validation → authorized persistence → UI render → retrieval after refresh.
- Verify unauthorized users cannot retrieve another user's output and failed inference leaves no success artifact.

## Free-hosting constraint and feasibility

Do not create paid resources or enable a paid API. First inspect free compute already available and run only bounded experiments that fit its documented limits. Free CPU hosting can support contract tests, data validation, and small research experiments, but it is not a promise of practical, high-quality image generation. Training a useful image model from scratch may require more compute and authorized data than free services provide.

If free resources cannot satisfy a stage, record the blocker and leave generation unavailable rather than switching to a third-party API, downloading pretrained weights as a substitute, or incurring charges.

## Acceptance criteria

Image generation is **not ready** until all are true:

- A separately specified, Fresh-trained image model and matching serving implementation exist.
- The loaded checkpoint and all required artifacts pass hash, version, and promotion checks.
- The inference runtime demonstrates genuine text-to-image output, not a placeholder, a stock image, or a canned PNG.
- A generated PNG passes structural validation and reasonable dimension/size limits.
- End-to-end signed-in generation, persistence, retrieval, and UI rendering pass in the deployed environment.
- Auth boundaries, timeouts, abuse limits, failure behavior, and provenance tests pass.
- The public status endpoint reports the tested state without exposing secrets.
- No paid hosting or external model provider is used.

Until then, show a clear unavailable message and do not claim that Fresh AI generated an image.
