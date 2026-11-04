# Fresh Astra Vision pilot — v0.1

## Goal
Establish a genuinely Fresh-owned image-perception training and evaluation loop before attempting broad camera or scene understanding.

## Scope
The first model is a small CNN initialized from random weights. It learns two bounded tasks from procedurally generated, Fresh-owned 64x64 images: shape (circle, square, triangle) and colour (blue, green, red, yellow).

This pilot contains no people, faces, personal data, third-party images, pretrained weights, or external inference APIs. The training pipeline creates train/validation/test splits, verifies each image SHA-256, requires a reviewed manifest, records checkpoint provenance and reports held-out metrics.

## Run on an existing free CPU environment
    python3 -m pip install -r training/requirements.txt
    python3 training/generate_fresh_astra_vision_synthetic.py --output /tmp/fresh-astra-vision-data --count 240
    python3 training/train_fresh_astra_vision.py --manifest /tmp/fresh-astra-vision-data/manifest.json --dataset-root /tmp/fresh-astra-vision-data --output /tmp/fresh-astra-vision-0.1.pt --epochs 8

## Verify
    cd training && python3 -m unittest test_fresh_astra_vision

The test trains from random initialization on a small synthetic dataset and evaluates on a held-out test split. It verifies checkpoint hashes and fails closed if the manifest is not approved.

## Readiness boundary
A successful pilot proves only that Fresh can train and evaluate this narrow synthetic classifier. It does not prove general image understanding, object detection, OCR, face recognition, camera intelligence, or production serving. The checkpoint is experimental and is never automatically registered as the production fresh-unified-1 checkpoint. Astra's existing authenticated vision API remains unavailable until a reviewed serving runtime is connected and tested.
