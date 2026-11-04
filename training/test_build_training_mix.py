import gzip
import json
import tempfile
import unittest
from pathlib import Path

import build_training_mix as mix

REG = {"hf-oasst1": {"status": "eligible", "trainingPermission": "verified", "derivativeModelPermission": "verified",
                     "evidenceRef": "x", "license": "Apache-2.0"}}


def row(i):
    return {"id": f"r{i}", "input": "q", "target": "a" * 50,
            "metadata": {"authorizationId": "hf-oasst1", "license": "Apache-2.0", "sourceType": "hf-public-dataset"}}


class MixTest(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        with gzip.open(self.tmp / "a.jsonl.gz", "wt") as fh:
            for i in range(200):
                fh.write(json.dumps(row(i)) + "\n")
        self.recipe = {"seed": 1, "validationFraction": 0.1,
                       "sources": [{"id": "a", "path": "a.jsonl.gz", "repeat": 2},
                                   {"id": "missing", "path": "nope.jsonl", "optional": True}]}

    def test_deterministic_and_split(self):
        t1, v1, rep = mix.build(self.recipe, self.tmp, REG)
        t2, v2, _ = mix.build(self.recipe, self.tmp, REG)
        self.assertEqual([r["id"] for r in t1], [r["id"] for r in t2])
        self.assertTrue({r["id"] for r in t1}.isdisjoint({r["id"] for r in v1}))
        self.assertEqual(len(t1) + 2 * len(v1), 2 * 200)  # train repeated x2, validation not repeated
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
