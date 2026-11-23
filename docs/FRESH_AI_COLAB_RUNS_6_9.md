# Fresh AI Colab experiment integration: Runs 6–9

## Purpose and serving boundary

Runs 6–9 are now represented in the Fresh AI experiment registry and application metadata. They are experiment evidence, not a production model switch. The canonical baseline remains `fresh-unified-1-run3` with `weightsStatus: training-required`. No checkpoint binary was supplied with this repository change, so the checkpoint hashes below are transcribed from the uploaded notebooks' manifests and verification outputs; they have not been independently re-hashed from the binary files here.

## Run map

| Run | Role | Recorded result | Decision |
|---|---|---|---|
| 6 | Same-data evaluation | Run 5: 0/224 recall; Run 3: 0/224. Run 4: 47/224 but is explicitly a leaky reference. | Do not select Run 4; Run 5 has no demonstrated recall gain and has >5% Dolly and Swahili-Wikipedia perplexity regressions. |
| 7 | Readiness gatebook | Notebook contains an empty `MANUAL_REVIEWS` map; no executed readiness JSON/report is present. | Prepared, not executed. No readiness pass. |
| 8 | Fresh-fact fine-tuning | 630 steps; 34/80 taught-fact questions passed (42.5%); 0/80 passage-grounding; retention regressions: Dolly +7.9%, Wikipedia-Swahili +5.2%. | Useful knowledge-recall signal, but retention regressions and grounding failure block promotion. |
| 9 | Passage-conditioned fine-tuning | 705 steps; 5/80 taught-fact questions passed (6.2%); 1/80 passage-grounding; no >5% retention regression. | No clear capability gain; not promotable. |

## Lineage

Both Run 8 and Run 9 initialize from the exact Run 3 checkpoint hash:
`298b558e89edab77745834389cb2b1979e632979f9be7b4adad1892c2f2fc25d`.

Run 9 does **not** continue from Run 8. It is a separate Run 3-initialized experiment. Do not describe these as sequential weight continuation.

## Notebook evidence fingerprints

The exact uploaded notebook bytes are fingerprinted in `training/runs/colab-experiment-registry-v1.json`. The uploaded notebook files remain the source evidence; the registry stores their SHA-256 fingerprints and extracted run summaries.

## What this integration changes

- Adds a machine-readable evidence registry for Runs 6–9.
- Exposes typed experiment metadata to Fresh AI through `FreshAIColabExperimentRegistry.ts`.
- Adds a CI verifier to prevent run status drift and accidental promotion claims.

## What it does not change

- It does not copy checkpoint binaries into Git.
- It does not attach Run 8 or Run 9 to `FreshUnifiedModelRuntime.trainedInference`.
- It does not register either candidate as the production checkpoint.
- It does not mark Run 7 ready.
- It does not claim independent binary verification, safety approval, grounding success, or production readiness.

## Next evidence required

1. Export the Run 7 readiness report and its referenced manual-review evidence.
2. Retrieve the Run 8 and Run 9 checkpoint files and independently re-hash them against the recorded manifests.
3. Add robust instruction-following, truthfulness/abstention, grounding, passage QA, tool-use, and safety evaluations.
4. Resolve Run 8's Dolly and Swahili retention regressions.
5. Only after all gates pass, prepare a separate owner-approved promotion and runtime integration change with rollback evidence.
