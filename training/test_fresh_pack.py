import unittest

import numpy as np

import fresh_pack as fp


def enc(text):
    return [10 + (ord(c) % 50) for c in text]


class PackTest(unittest.TestCase):
    def test_row_ids_framing(self):
        ids = fp.row_to_ids({"input": "ab", "target": "c"}, enc)
        self.assertEqual(ids[0], fp.BOS)
        self.assertEqual(ids[-1], fp.EOS)
        self.assertEqual(ids.count(fp.SEP), 1)

    def test_stream_and_blocks_shift_by_one(self):
        rows = [{"input": "hello", "target": "world" * 5}] * 10
        s = fp.to_stream(rows, enc, 32000)
        x, y = fp.get_block(s, 1, 16)
        self.assertEqual(list(x[1:]), list(y[:-1]))
        self.assertGreater(fp.n_blocks(len(s), 16), 5)

    def test_order_is_deterministic_and_a_permutation(self):
        a, b = fp.block_order(100, 3, 7), fp.block_order(100, 3, 7)
        self.assertTrue((a == b).all())
        self.assertEqual(sorted(a.tolist()), list(range(100)))
        self.assertFalse((fp.block_order(100, 4, 7) == a).all())

    def test_resume_reproduces_batches(self):
        s = np.arange(5000, dtype=np.uint16) % 997
        full = fp.iter_batches(s, 16, 4, 0, 1)
        batches = [next(full) for _ in range(6)]
        resumed = next(fp.iter_batches(s, 16, 4, 5, 1))
        self.assertTrue((batches[5][0] == resumed[0]).all())

    def test_lr_schedule(self):
        kw = dict(warmup=10, max_steps=100, peak=1.0)
        self.assertLess(fp.cosine_lr(0, **kw), fp.cosine_lr(9, **kw))
        self.assertAlmostEqual(fp.cosine_lr(10, **kw), 1.0, places=3)
        self.assertAlmostEqual(fp.cosine_lr(100, **kw), 0.1)
        self.assertGreater(fp.cosine_lr(50, **kw), fp.cosine_lr(90, **kw))

    def test_vocab_guard(self):
        with self.assertRaises(ValueError):
            fp.to_stream([], enc, 70000)


if __name__ == "__main__":
    unittest.main()
