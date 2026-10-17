# Fresh AI idea-to-capability intake

Status: working process contract. Pasted material is a source of ideas, not permission to copy its text, data, model weights, or private implementation.

## Core rule

When a user pastes a tutorial, article, model overview, code sample, or another AI's answer, Fresh AI engineering should extract the general problem-solving idea and independently adapt it to Fresh's architecture. Preserve exact third-party wording only when a short quotation is necessary and permitted; never bulk-copy proprietary datasets, private prompts, protected source code, or model weights.

## Intake stages

1. **Capture** — record the user's goal, the source URL/name if known, date received, and the relevant excerpt or summary in the appropriate project note. Do not put secrets or unrelated personal data into the intake record.
2. **Classify** — choose one primary destination: product requirement, architecture/design, runtime implementation, retrieval/knowledge, training-data candidate, evaluation test, security/privacy control, or rejected/out-of-scope.
3. **Extract the principle** — write a Fresh-owned summary of the underlying technique, the problem it solves, assumptions, limitations, and what must be verified. Distinguish facts from suggestions and claims made by the source.
4. **Map to the existing system** — locate the owning Fresh Web Lite module, API, data contract, test, or training stage. Prefer extending an existing capability over creating a disconnected demo or duplicate subsystem.
5. **Check permissions and safety** — code, datasets, media, and text each need a lawful basis and applicable license/authorization. Public visibility alone is not blanket training permission. Unclear rights mean quarantine or reject.
6. **Implement the smallest end-to-end change** — include validation, error handling, access controls, telemetry that avoids secrets, and user-visible status where applicable.
7. **Prove it** — add a regression or capability test tied to the original goal; run the relevant test and build; inspect the changed files and preview where available. Record actual output, not intended output.
8. **Promote gradually** — merge only after review and required checks. Training candidates must pass dataset validation and split/contamination checks; model changes require held-out evaluation, checkpoint integrity, serving tests, and explicit promotion.
9. **Report honestly** — label each item as idea captured, design approved, implemented, test-passed, preview-verified, merged, or production-verified. Do not call a note or dataset row a learned capability.

## Training-data-specific boundary

A pasted explanation can inspire a synthetic instruction/target pair if it is independently written and reviewed. That teaches a text pattern only. It does not provide actual image, audio, video, or document supervision, and adding examples does not itself update model weights. Native multimodal learning requires authorized media assets, aligned annotations, a modality-aware loader/model path, an actual training run, and held-out modality-specific evaluation.

## Intake record template

- **User goal:** What should Fresh AI do better?
- **Source/provenance:** Where the idea came from; unknown if not supplied.
- **Fresh-owned principle:** Independent summary, not a copied article.
- **Target component:** Existing file/module/API/data pipeline.
- **Expected behavior:** Observable result a user can verify.
- **Permissions/security:** License, authorization, privacy, and abuse considerations.
- **Acceptance test:** A reproducible test that fails before and passes after the change.
- **Status/evidence:** Links to commit/PR, test output, preview, and any remaining blockers.

## Acceptance gate

An idea is not considered integrated merely because it has been summarized or added to a JSONL corpus. Integration requires a mapped Fresh component and an observable test; a model-learning claim additionally requires verified training and evaluation evidence.
