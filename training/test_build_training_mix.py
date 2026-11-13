import gzip
import json
import tempfile
import unittest
from pathlib import Path

import build_training_mix as mix

REG = {"hf-oasst1": {"status": "eligible", "trainingPermission": "verified", "derivativeModelPermission": "verified",
                     "evidenceRef": "x", "license": "Apache-2.0"}}


def row(i, target=None):
    return {"id": f"r{i}", "input": f"question {i}", "target": target or f"unique answer {i} with sufficient words",
            "metadata": {"authorizationId": "hf-oasst1", "license": "Apache-2.0", "sourceType": "hf-public-dataset"}}


class MixTest(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        rows = []
        for i in range(80):
            answer = f"canonical answer group {i} has several words"
            rows.append(row(f"{i}-a", answer))
            rows.append(row(f"{i}-b", answer.upper() + "   "))
        with gzip.open(self.tmp / "a.jsonl.gz", "wt", encoding="utf-8") as fh:
            for item in rows:
                fh.write(json.dumps(item) + "\n")
        self.recipe = {"seed": 1, "validationFraction": 0.25,
                       "sources": [{"id": "a", "path": "a.jsonl.gz", "repeat": 2},
                                   {"id": "missing", "path": "nope.jsonl", "optional": True}]}

    def test_deterministic_and_answer_groups_do_not_leak(self):
        t1, v1, rep = mix.build(self.recipe, self.tmp, REG)
        t2, v2, _ = mix.build(self.recipe, self.tmp, REG)
        self.assertEqual([r["id"] for r in t1], [r["id"] for r in t2])
        self.assertEqual([r["id"] for r in v1], [r["id"] for r in v2])
        train_answers = {mix.normalized_target(r) for r in t1}
        val_answers = {mix.normalized_target(r) for r in v1}
        self.assertFalse(train_answers & val_answers, "normalized answer groups leaked across train/validation")
        self.assertEqual(rep["splitGrouping"], "normalized-target-sha256-v1")
        self.assertEqual(len(t1) + 2 * len(v1), 2 * 160)
        self.assertGreater(len(train_answers), 0)
        self.assertGreater(len(val_answers), 0)
        self.assertEqual(rep["skipped"][0]["id"], "missing")

    def test_unauthorized_row_fails_closed(self):
        with self.assertRaises(ValueError):
            mix.build(self.recipe, self.tmp, {})

    def test_required_missing_is_error(self):
        self.recipe["sources"].append({"id": "req", "path": "gone.jsonl"})
        with self.assertRaises(FileNotFoundError):
            mix.build(self.recipe, self.tmp, REG)


if __name__ == "__main__":
    unittest.main()
