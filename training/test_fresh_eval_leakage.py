"""Unit tests for answer-level Fresh evaluation leakage detection."""
import unittest

from audit_fresh_eval_leakage import audit_rows, normalize_answer


class FreshEvalLeakageTests(unittest.TestCase):
    def test_removes_docs_provenance_and_normalizes_unicode(self):
        self.assertEqual(
            normalize_answer('Per docs/a.md (Guide), section "Intro":  ＨＥＬＬＯ   World '),
            "hello world",
        )

    def test_disjoint_answers_and_questions_pass(self):
        result = audit_rows(
            [{"id": "train-1", "input": "Explain alpha", "target": "Alpha is distinct."}],
            [{"id": "eval-1", "input": "Describe beta", "reference": "Beta is separate."}],
        )
        self.assertTrue(result["passed"])
        self.assertEqual(result["answerOverlapCount"], 0)
        self.assertEqual(result["questionOverlapCount"], 0)

    def test_same_answer_with_different_question_fails(self):
        result = audit_rows(
            [{"id": "train-1", "input": "Question A", "target": "Per docs/a.md (Guide), section \"A\": Shared answer."}],
            [{"id": "eval-2", "input": "Question B", "reference": "Shared   answer."}],
        )
        self.assertFalse(result["passed"])
        self.assertEqual(result["answerOverlapCount"], 1)

    def test_same_question_with_different_answer_fails(self):
        result = audit_rows(
            [{"id": "train-1", "input": "Same question", "target": "Train answer."}],
            [{"id": "eval-2", "input": "Same question", "reference": "Eval answer."}],
        )
        self.assertFalse(result["passed"])
        self.assertEqual(result["questionOverlapCount"], 1)


if __name__ == "__main__":
    unittest.main()
