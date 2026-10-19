"""Unit tests for the fail-closed Fresh Unified inference artifact gate."""
from __future__ import annotations

import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from serve_fresh_unified import validate_artifacts


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


class InferenceArtifactGateTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.checkpoint = self.root / "model.pt"
        self.tokenizer = self.root / "tokenizer.json"
        self.spec = self.root / "model_spec.json"
        self.checkpoint.write_bytes(b"test-checkpoint-bytes")
        self.tokenizer.write_text(json.dumps({
            "manifest": {
                "modelId": "fresh-unified-1",
                "tokenizerId": "fresh-unified-tokenizer-v1",
                "productionReady": True,
                "datasetSha256": "a" * 64,
            },
            "merges": [],
        }), encoding="utf-8")
        self.spec.write_text(json.dumps({
            "modelId": "fresh-unified-1",
            "tokenizerId": "fresh-unified-tokenizer-v1",
            "contextLength": 128,
        }), encoding="utf-8")
        self.manifest = {
            "schema": "fresh-unified-checkpoint-v1",
            "modelId": "fresh-unified-1",
            "tokenizerId": "fresh-unified-tokenizer-v1",
            "executionStatus": "completed",
            "pipelineSmokeTest": False,
            "productionReady": True,
            "promotionStatus": "approved",
            "evaluationStatus": "passed",
            "checkpointSha256": digest(self.checkpoint),
            "tokenizerSha256": digest(self.tokenizer),
            "datasetSha256": "a" * 64,
            "modelSpecSha256": digest(self.spec),
        }
        self.write_manifest()

    def tearDown(self):
        self.temp.cleanup()

    def write_manifest(self):
        self.checkpoint.with_suffix(".pt.json").write_text(
            json.dumps(self.manifest), encoding="utf-8"
        )

    def test_valid_promoted_artifacts_pass_static_gate(self):
        manifest, _artifact, _tokenizer_manifest, spec = validate_artifacts(
            self.checkpoint, self.tokenizer, self.spec
        )
        self.assertEqual(manifest["modelId"], "fresh-unified-1")
        self.assertEqual(spec["contextLength"], 128)

    def test_smoke_test_checkpoint_is_rejected(self):
        self.manifest["pipelineSmokeTest"] = True
        self.write_manifest()
        with self.assertRaisesRegex(ValueError, "smoke-test"):
            validate_artifacts(self.checkpoint, self.tokenizer, self.spec)

    def test_unapproved_checkpoint_is_rejected(self):
        self.manifest["promotionStatus"] = "pending"
        self.write_manifest()
        with self.assertRaisesRegex(ValueError, "explicit production promotion"):
            validate_artifacts(self.checkpoint, self.tokenizer, self.spec)

    def test_tampered_checkpoint_is_rejected(self):
        self.checkpoint.write_bytes(b"tampered")
        with self.assertRaisesRegex(ValueError, "Checkpoint SHA-256 mismatch"):
            validate_artifacts(self.checkpoint, self.tokenizer, self.spec)

    def test_unpromoted_tokenizer_is_rejected(self):
        artifact = json.loads(self.tokenizer.read_text(encoding="utf-8"))
        artifact["manifest"]["productionReady"] = False
        self.tokenizer.write_text(json.dumps(artifact), encoding="utf-8")
        self.manifest["tokenizerSha256"] = digest(self.tokenizer)
        self.write_manifest()
        with self.assertRaisesRegex(ValueError, "tokenizer cannot be served"):
            validate_artifacts(self.checkpoint, self.tokenizer, self.spec)


if __name__ == "__main__":
    unittest.main()
