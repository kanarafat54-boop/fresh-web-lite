import unittest

import fresh_eval as fe


class EvalTest(unittest.TestCase):
    def test_keyword_score(self):
        self.assertEqual(fe.keyword_score("Fresh uses TRUTH states", ["truth", "states", "memory", "agent"]), 0.5)
        self.assertEqual(fe.keyword_score("anything", []), 0.0)

    def test_lang_guess(self):
        self.assertEqual(fe.guess_lang("Uganda ni nchi katika Afrika na ina mji mkuu wa Kampala"), "sw")
        self.assertEqual(fe.guess_lang("Uganda is a country in Africa and the capital is Kampala"), "en")

    def test_groups(self):
        self.assertEqual(fe.group_of({"id": "fresh-docs-qa-1"}), "fresh-docs")
        self.assertEqual(fe.group_of({"id": "oasst1-abc-1"}), "oasst1")
        self.assertEqual(fe.group_of({"id": "wikipedia-9-x", "target": "Mji ni wa kwa na ya"}), "wikipedia-sw")
        self.assertEqual(fe.group_of({"id": "zzz"}), "fresh-other")

    def test_summary_and_perplexity(self):
        s = fe.recall_summary([{"score": 0.6}, {"score": 0.2}])
        self.assertEqual(s["passRate"], 0.5)
        p = fe.perplexity_by_group([("a", 20.0, 10), ("a", 10.0, 10), ("b", 7.0, 7)])
        self.assertAlmostEqual(p["a"]["loss"], 1.5)
        self.assertAlmostEqual(p["b"]["perplexity"], 2.718281828, places=5)

    def test_stride_sample_is_deterministic_and_spread(self):
        items = list(range(100))
        self.assertEqual(fe.stride_sample(items, 10), fe.stride_sample(items, 10))
        self.assertEqual(fe.stride_sample(items, 10)[:3], [0, 10, 20])
        self.assertEqual(len(fe.stride_sample(items, 1000)), 100)


if __name__ == "__main__":
    unittest.main()
