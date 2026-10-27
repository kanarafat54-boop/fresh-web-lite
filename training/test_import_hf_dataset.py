import unittest

import import_hf_dataset as imp
from fresh_corpus_policy import load_authorization_registry, validate_row_authorization

AUTH = {"authorizationId": "hf-oasst1", "license": "Apache-2.0"}
LONG = "This is a sufficiently long assistant answer about Fresh Web Lite features."


class ImportHfDatasetTest(unittest.TestCase):
    def test_unauthorized_source_is_blocked(self):
        with self.assertRaises(SystemExit):
            imp.require_authorization("dolly")  # candidates are not authorizations

    def test_oasst_pairs_prompter_to_assistant_only(self):
        msgs = [
            {"message_id": "a1", "parent_id": None, "role": "prompter", "text": "What is Fresh?", "lang": "en"},
            {"message_id": "b1", "parent_id": "a1", "role": "assistant", "text": LONG, "lang": "en", "review_result": True},
            {"message_id": "b2", "parent_id": "a1", "role": "assistant", "text": LONG + " deleted", "lang": "en", "deleted": True},
            {"message_id": "b3", "parent_id": "a1", "role": "assistant", "text": LONG + " rejected", "lang": "en", "review_result": False},
            {"message_id": "b4", "parent_id": "a1", "role": "assistant", "text": LONG + " wrong lang", "lang": "ja"},
        ]
        rows = list(imp.convert("oasst1", AUTH, msgs))
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["input"], "What is Fresh?")

    def test_dolly_includes_context(self):
        rows = list(imp.convert("dolly", {"authorizationId": "hf-dolly-15k", "license": "CC-BY-SA-3.0"},
                                [{"instruction": "Summarize", "context": "ctx", "response": LONG, "category": "summarization"}]))
        self.assertIn("Context:\nctx", rows[0]["input"])

    def test_rows_pass_authorization_when_registry_allows(self):
        row = list(imp.convert("dolly", {"authorizationId": "hf-dolly-15k", "license": "CC-BY-SA-3.0"},
                               [{"instruction": "Hi", "response": LONG}]))[0]
        registry = {"hf-dolly-15k": {"status": "eligible", "trainingPermission": "verified",
                                       "derivativeModelPermission": "verified", "evidenceRef": "x", "license": "CC-BY-SA-3.0"}}
        self.assertEqual(validate_row_authorization(row, registry, 1), "hf-dolly-15k")

    def test_candidates_never_in_registry(self):
        reg = load_authorization_registry()
        promoted = {"hf-oasst1"}  # Apache-2.0, human-written; owner-approved
        for spec in imp.SOURCES.values():
            if spec["authorizationId"] not in promoted:
                self.assertNotIn(spec["authorizationId"], reg)
        self.assertEqual(imp.require_authorization("oasst1")["license"], "Apache-2.0")

    def test_continuation_skips_short_text(self):
        self.assertEqual(list(imp.convert("common-corpus", AUTH, [{"text": "short"}])), [])


if __name__ == "__main__":
    unittest.main()
