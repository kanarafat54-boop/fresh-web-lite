import unittest

import screen_corpus as sc


def R(i, t, inp="Question?"):
    return {"id": i, "input": inp, "target": t, "metadata": {}}


def run(rows):
    return [(r["id"] if r else None, why) for r, why in sc.screen(rows)]


class ScreenTest(unittest.TestCase):
    def test_secret_dropped(self):
        self.assertEqual(run([R("a", "key AKIAABCDEFGHIJKLMNOP here")])[0][1], "secret:aws-key")

    def test_card_luhn(self):
        self.assertTrue(sc.has_card("pay 4111 1111 1111 1111 now"))
        self.assertFalse(sc.has_card("order 1234 5678 9012 3456"))

    def test_outside_ai_dropped(self):
        self.assertEqual(run([R("a", "As an AI language model, I cannot")])[0][1], "outside-ai-provenance")

    def test_redaction(self):
        rows = list(sc.screen([R("a", "mail me at bob@example.com or call +256 700 123 456")]))
        row, why = rows[0]
        self.assertEqual(why, "kept-redacted")
        self.assertIn("[EMAIL]", row["target"])
        self.assertIn("[PHONE]", row["target"])
        self.assertNotIn("bob@", row["target"])

    def test_duplicates(self):
        out = run([R("a", "Same answer text."), R("b", "same  answer text!"), R("c", "Different answer.")])
        self.assertEqual([w for _, w in out], ["kept", "duplicate-exact", "kept"])

    def test_metadata_marks_screened(self):
        row, _ = next(iter(sc.screen([R("a", "A clean answer.")])))
        self.assertEqual(row["metadata"]["screened"], "fresh-screen-v1")


if __name__ == "__main__":
    unittest.main()
