"""Static validation for the reviewed Fresh Run 5 Kaggle notebook."""
import ast
import json
import unittest
from pathlib import Path

NOTEBOOK = Path(__file__).parent / "notebooks" / "fresh_unified_training_run5_kaggle.ipynb"


class FreshRun5NotebookTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.notebook = json.loads(NOTEBOOK.read_text(encoding="utf-8"))
        cls.cells = cls.notebook["cells"]
        cls.code = "\\n\\n".join(
            "".join(cell.get("source", []))
            for cell in cls.cells
            if cell.get("cell_type") == "code"
        )

    def test_all_python_cells_parse(self):
        for index, cell in enumerate(self.cells):
            if cell.get("cell_type") == "code":
                with self.subTest(cell=index):
                    ast.parse("".join(cell.get("source", [])))

    def test_pins_reviewed_merge_and_run3_artifact_identities(self):
        self.assertIn("73da0be7d572e56bb92b23cc869be68d31ed97e3", self.code)
        self.assertIn("298b558e89edab77745834389cb2b1979e632979f9be7b4adad1892c2f2fc25d", self.code)
        self.assertIn("dc820bac32dd5f3bc0b47eac545d4baa33cde93da05014b2d90d0903b0c7b06c", self.code)

    def test_requires_leakage_gate_and_run3_initialization(self):
        self.assertIn("audit_fresh_eval_leakage.py", self.code)
        self.assertIn("--validation", self.code)
        self.assertIn("--init-from", self.code)
        self.assertIn("fresh-unified-1-run3.pt", self.code)

    def test_controlled_run_and_paired_evaluation(self):
        self.assertIn("--max-steps 654", self.code)
        self.assertIn("eval-run3.json", self.code)
        self.assertIn("eval-run5.json", self.code)
        self.assertIn("run3CheckpointSha256", self.code)
        self.assertIn("run5CheckpointSha256", self.code)

    def test_blocks_unverified_partial_resume_state(self):
        self.assertIn("any(RUN5_DIR.iterdir())", self.code)
        self.assertIn("Automatic resume is blocked", self.code)
        self.assertIn("last.pt", self.code)

    def test_never_promotes_candidate_or_trains_new_tokenizer(self):
        self.assertIn('["productionReady"] is False', self.code)
        self.assertNotIn("fresh_tokenizer_v2.py train", self.code)
        self.assertNotIn("model_registry", self.code.lower())


if __name__ == "__main__":
    unittest.main()
