# Fresh AI Shared Engine Fabric

## Purpose

Fresh AI uses one shared execution contract for specialist engines. Astra remains the coordinator; Fresh Unified remains the central trained model identity; specialist engines perform bounded modality or compute work. This fabric does not create substitute models or silently route work to third-party providers.

## Engine inventory

The gateway returns `engineReadiness` on every Fresh AI response. The inventory distinguishes:

- `available`: verified for execution (none of the remote generation engines are promoted by configuration alone).
- `configured-not-verified`: endpoint and server token exist, but live inference, output validation and persistence have not passed verification.
- `evaluation-required`: Fresh Unified Run 3 training is completed and preserved; checkpoint evaluation and production serving are not complete.
- `configuration-required`: no complete engine configuration exists.
- `simulation-only`: bounded software simulation is available, not a validated physics engine or physical-world controller.
- `blocked`: physical robotics execution is disabled.

The inventory includes Fresh Unified, image generation, audio, video generation, media processing, spatial/3D, simulation, agents and robotics. In particular, the FFmpeg media worker is processing infrastructure; it is not a text-to-video generation model.

## Execution contract

`executeFreshAIEngineJob` validates authenticated user identity, consent, request/job/idempotency identifiers, bounded input, opaque asset references, environment, engine readiness, adapter registration and returned model/job identity. Output artifacts require opaque storage references, MIME types and SHA-256 digests.

Dispatch fails closed when:
- the engine is missing or not verified for the requested environment;
- no explicit Fresh-owned adapter is registered;
- consent or user identity is missing;
- the engine attempts physical robotics execution;
- the adapter returns a mismatched model/job identity or malformed artifact metadata.

The adapter is injected explicitly. There is no default adapter and no third-party fallback. The fabric is an execution contract and readiness surface, not a claim that all workers or durable queue infrastructure have been deployed.

## Next integration gates

1. Supply and evaluate the existing Run 3 checkpoint and register a real Fresh Unified serving worker.
2. Implement and deploy the Fresh-owned video generation worker separately from media processing.
3. Add audio and spatial/3D workers with real inference and output validation.
4. Add durable job persistence, retries, cancellation, idempotency across processes, audit events and usage/resource accounting.
5. Promote a worker from configured to available only after authenticated end-to-end tests and production health verification.
6. Keep physical actuation blocked pending simulation, hardware-in-loop testing, interlocks, emergency stop and independent safety review.

## Verification

Run `npm run test:fresh-ai-engine-fabric`. This test covers readiness classification, explicit adapter dispatch, consent, input bounds, fail-closed behavior and result identity. It does not replace live engine integration tests.
