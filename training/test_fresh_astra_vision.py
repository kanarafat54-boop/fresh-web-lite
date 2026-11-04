"""End-to-end CPU smoke test for the Fresh Astra vision training pipeline."""
from __future__ import annotations
import json
import tempfile
import unittest
from pathlib import Path
import torch
from generate_fresh_astra_vision_synthetic import generate_dataset
from train_fresh_astra_vision import load_records, train
from fresh_astra_vision_model import MODEL_ID

class FreshAstraVisionTrainingTests(unittest.TestCase):
    def test_fresh_owned_synthetic_training_and_held_out_evaluation(self):
        torch.set_num_threads(1)
        with tempfile.TemporaryDirectory(prefix="fresh-astra-vision-") as temporary:
            root = Path(temporary)
            manifest = generate_dataset(root / "dataset", count=240, seed=20261030)
            loaded, splits = load_records(manifest, root / "dataset")
            self.assertEqual(loaded["owner"], "Fresh AI")
            self.assertEqual(set(splits), {"train", "validation", "test"})
            self.assertEqual(sum(map(len, splits.values())), 240)
            output = root / "artifacts" / "fresh-astra-vision-0.1.pt"
            metadata = train(manifest, root / "dataset", output, epochs=30, seed=7)
            self.assertTrue(output.is_file())
            self.assertTrue(output.with_suffix(output.suffix + ".json").is_file())
            self.assertEqual(metadata["modelId"], MODEL_ID)
            self.assertFalse(metadata["pretrainedWeightsUsed"])
            self.assertFalse(metadata["thirdPartyInferenceUsed"])
            self.assertFalse(metadata["productionReady"])
            self.assertEqual(metadata["test"]["examples"], len(splits["test"]))
            self.assertGreater(metadata["test"]["shapeAccuracy"], 0.45)
            self.assertGreater(metadata["test"]["colourAccuracy"], 0.45)
            self.assertEqual(len(metadata["checkpointSha256"]), 64)

    def test_unapproved_dataset_is_blocked(self):
        with tempfile.TemporaryDirectory(prefix="fresh-astra-vision-block-") as temporary:
            root = Path(temporary)
            manifest = generate_dataset(root / "dataset", count=60)
            data = json.loads(manifest.read_text(encoding="utf-8"))
            data["license_review"]["review_status"] = "pending"
            manifest.write_text(json.dumps(data), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "approved provenance review"):
                load_records(manifest, root / "dataset")

if __name__ == "__main__":
    unittest.main()
