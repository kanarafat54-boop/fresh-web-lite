import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from serve_fresh_unified_v2 import validate_run3_artifacts


class Run3ArtifactValidationTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.checkpoint = self.root / "fresh-unified-1-run3.pt"
        self.tokenizer = self.root / "tokenizer-v2.json"
        self.tokenizer_manifest = self.root / "tokenizer-v2.manifest.json"
        self.run_manifest = self.root / "fresh-unified-1-run3.pt.json"
        self.spec = self.root / "model_spec_v2.json"
        self.checkpoint.write_bytes(b"test checkpoint bytes")
        self.tokenizer.write_bytes(b"test tokenizer bytes")
        digest = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
        self.tokenizer_manifest.write_text(json.dumps({
            "schema": "fresh-unified-tokenizer-v2",
            "modelId": "fresh-unified-1",
            "tokenizerId": "fresh-unified-tokenizer-v2",
            "tokenizerSha256": digest(self.tokenizer),
        }))
        self.run_manifest.write_text(json.dumps({
            "schema": "fresh-unified-checkpoint-v1",
            "modelId": "fresh-unified-1",
            "runId": "fresh-unified-1-run3",
            "executionStatus": "completed",
            "pipelineSmokeTest": False,
            "tokenizerId": "fresh-unified-tokenizer-v2",
            "checkpointSha256": digest(self.checkpoint),
            "tokenizerSha256": digest(self.tokenizer),
            "parameters": 49_947_136,
            "productionReady": False,
            "evaluation": {"safetyReview": "pending"},
        }))
        self.spec.write_text(json.dumps({
            "schema": "fresh-unified-model-spec-v2",
            "modelId": "fresh-unified-1",
            "tokenizerId": "fresh-unified-tokenizer-v2",
            "vocabSize": 32000,
            "contextLength": 2048,
            "hiddenSize": 512,
            "layers": 8,
            "attentionHeads": 8,
            "feedForwardSize": 2048,
        }))

    def tearDown(self):
        self.tmp.cleanup()

    def args(self):
        return (self.checkpoint, self.tokenizer, self.tokenizer_manifest, self.run_manifest, self.spec)

    def test_unpromoted_checkpoint_requires_explicit_research_flag(self):
        with self.assertRaisesRegex(ValueError, "not promoted"):
            validate_run3_artifacts(*self.args(), allow_unpromoted=False)

    def test_valid_run3_artifacts_pass_only_in_research_mode(self):
        manifest = validate_run3_artifacts(*self.args(), allow_unpromoted=True)
        self.assertEqual(manifest["runId"], "fresh-unified-1-run3")
        self.assertFalse(manifest["productionReady"])

    def test_checkpoint_tampering_is_rejected(self):
        self.checkpoint.write_bytes(b"tampered checkpoint")
        with self.assertRaisesRegex(ValueError, "checkpoint SHA-256 mismatch"):
            validate_run3_artifacts(*self.args(), allow_unpromoted=True)

    def test_tokenizer_mismatch_is_rejected(self):
        payload = json.loads(self.run_manifest.read_text())
        payload["tokenizerId"] = "fresh-unified-tokenizer-v1"
        self.run_manifest.write_text(json.dumps(payload))
        with self.assertRaisesRegex(ValueError, "tokenizer v2"):
            validate_run3_artifacts(*self.args(), allow_unpromoted=True)


if __name__ == "__main__":
    unittest.main()
