import assert from "node:assert/strict";
import fs from "node:fs";
import { GENESIS_HASH, canonicalJson, dailyDigest, proofHashInput, sha256Hex, verifyChain } from "../src/core/proof/proofChain.ts";

// Golden vector: three records and a day's digest produced by the real SQL in
// supabase/migrations/20261110100000_fresh_proof_core.sql on PostgreSQL 16. The independent JavaScript verifier must
// reproduce the database's hashes exactly; if either side changes the hashed text, this test fails.
const chain = [
  {
    "author_id": "11111111-1111-1111-1111-111111111111",
    "seq": 1,
    "kind": "prediction",
    "subject_type": "short",
    "subject_id": "abc",
    "body_json": "{\"statement\":\"A\",\"resolves_at\":\"2027-01-01\"}",
    "created_at_text": "2026-11-10T11:08:59.891689Z",
    "prev_hash": "0000000000000000000000000000000000000000000000000000000000000000",
    "record_hash": "5336cf7d12f6b72450393885979ccf96db61401013997af81ed601baa28eb6e3"
  },
  {
    "author_id": "11111111-1111-1111-1111-111111111111",
    "seq": 2,
    "kind": "claim",
    "subject_type": null,
    "subject_id": null,
    "body_json": "{\"text\":\"B\"}",
    "created_at_text": "2026-11-10T11:08:59.894643Z",
    "prev_hash": "5336cf7d12f6b72450393885979ccf96db61401013997af81ed601baa28eb6e3",
    "record_hash": "b57cec8385e0f02f9bc820558e0f34c2fcb0967264038b3c2d3c37c989e0023e"
  },
  {
    "author_id": "11111111-1111-1111-1111-111111111111",
    "seq": 3,
    "kind": "promise",
    "subject_type": null,
    "subject_id": null,
    "body_json": "{\"text\":\"C\"}",
    "created_at_text": "2026-11-10T11:08:59.895354Z",
    "prev_hash": "b57cec8385e0f02f9bc820558e0f34c2fcb0967264038b3c2d3c37c989e0023e",
    "record_hash": "4c93ed4438fca89ac1be6e5ed7ed0fe897aa03825793edfdba9aa75461f0a8ff"
  }
];
const dayRows = [{"author_id": "11111111-1111-1111-1111-111111111111", "seq": 1, "record_hash": "5336cf7d12f6b72450393885979ccf96db61401013997af81ed601baa28eb6e3"}, {"author_id": "11111111-1111-1111-1111-111111111111", "seq": 2, "record_hash": "b57cec8385e0f02f9bc820558e0f34c2fcb0967264038b3c2d3c37c989e0023e"}, {"author_id": "11111111-1111-1111-1111-111111111111", "seq": 3, "record_hash": "4c93ed4438fca89ac1be6e5ed7ed0fe897aa03825793edfdba9aa75461f0a8ff"}, {"author_id": "22222222-2222-2222-2222-222222222222", "seq": 1, "record_hash": "ec83d75455ba1fe54e5acffdfc14d8ffb13ce4a1bd6f512e246f9b51332d4c62"}];
const dbDigest = "ea0d7345cb7bdb8fc41d7651ac081cfac0bd88d87dcc722d3acf5368af038b15";

assert.deepEqual(await verifyChain(chain), { ok: true, checked: 3, brokenSeq: null });
assert.equal(chain[0].prev_hash, GENESIS_HASH);
assert.equal(await dailyDigest(dayRows), dbDigest);
assert.equal(await sha256Hex(proofHashInput(chain[0])), chain[0].record_hash);

// An edited record is detected at the edited record.
const edited = structuredClone(chain); edited[1].body_json = '{"text":"edited"}';
const editedCheck = await verifyChain(edited);
assert.equal(editedCheck.ok, false); assert.equal(editedCheck.brokenSeq, 2); assert.equal(editedCheck.checked, 1);

// A removed or re-ordered record is detected; order of input does not matter for an honest chain.
assert.equal((await verifyChain([chain[0], chain[2]])).ok, false);
assert.equal((await verifyChain([chain[2], chain[0], chain[1]])).ok, true);

// A rewritten timestamp, kind or subject also breaks the hash. A chain that does not start at 1 is rejected.
for (const [field, value] of [["created_at_text", "2020-01-01T00:00:00.000000Z"], ["kind", "claim"], ["subject_id", "other"]]) {
  const forged = structuredClone(chain); forged[0][field] = value;
  assert.equal((await verifyChain(forged)).ok, false, `${field} is covered by the hash`);
}
assert.equal((await verifyChain(chain.slice(1))).ok, false);

// Records of two authors are never accepted as one chain.
const mixed = structuredClone(chain); mixed[2].author_id = "22222222-2222-2222-2222-222222222222";
assert.equal((await verifyChain(mixed)).ok, false);

// Canonical JSON: key order never changes the text; non-finite numbers are refused.
assert.equal(canonicalJson({ b: 1, a: [2, { d: 1, c: 2 }], e: undefined }), '{"a":[2,{"c":2,"d":1}],"b":1}');
assert.equal(canonicalJson({ x: 1, y: 2 }), canonicalJson({ y: 2, x: 1 }));
assert.throws(() => canonicalJson({ n: NaN }));

// The migration keeps the properties the claims rest on.
const sql = fs.readFileSync(new URL("../supabase/migrations/20261110100000_fresh_proof_core.sql", import.meta.url), "utf8");
for (const needle of ["proof records are append-only", "before update", "before delete", "before truncate", "new.author_id := auth.uid()", "clock_timestamp()", "grant insert (kind, subject_type, subject_id, body_json)", "pg_advisory_xact_lock"]) {
  assert.ok(sql.toLowerCase().includes(needle.toLowerCase()), `migration keeps: ${needle}`);
}

console.log("Fresh Proof tests passed");
