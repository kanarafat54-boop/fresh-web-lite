# Fresh Proof — the shared accountability layer

Status: **first piece built (database table + independent verifier), not applied to production.** Everything beyond it below is a roadmap, not a claim.

## 1. The idea in one paragraph

Most platforms ask you to trust them about who said what, when, and whether a machine or a person did it. Fresh Proof is one public, append-only record where any person, company or automated agent can write a **claim, prediction, promise, provenance statement or action**. The database stamps the time, numbers each author's records, and links each record to the previous one with a hash. Anyone can download the records and **check the chain themselves**, without asking Fresh whether it is valid. One layer, many uses.

## 2. Why it is the best fit for a universal platform

- **One primitive instead of many features.** The Prediction Ledger is `kind = prediction`. Machine Access audit is `kind = action`. TrueMode/provenance is `kind = provenance`. Creator promises and public commitments are `kind = promise` and `kind = claim`. They share one schema, one verifier and one way for outsiders to build on it.
- **Companies can build on it for years without Fresh's permission to trust it.** An auditor, a newsroom, a marketplace or an AI vendor can read the records, verify them and write their own, through the same open contract (see Machine Access design).
- **It is hard to copy.** The code is small. The value is a body of verifiable records, an open standard others adopt, and trust earned over time. None of that can be built in a sprint.

Honesty on novelty: hash-chained logs (certificate transparency), signed content provenance (C2PA) and public prediction tracking each exist. I am not claiming any of them is new. The bet is the combination: one open accountability layer inside a social platform, writable by people and machines alike.

## 3. What is built in this change

- `public.proof_records` (migration `20261110100000_fresh_proof_core.sql`): append-only (update, delete and truncate are refused by triggers even for the table owner), public to read, writable only as yourself. Time, sequence number, previous hash and the record hash are set by the database; values a client sends for them are ignored.
- `proof_verify_chain(author)`: re-computes one author's chain in the database and names the first broken record.
- `proof_daily_digest(day)`: one SHA-256 over a UTC day's record hashes, for publishing outside Fresh.
- `src/core/proof/proofChain.ts`: a verifier that runs anywhere JavaScript runs (browser, server, a partner's script). It recomputes every hash and never asks the server if the chain is valid.
- `scripts/test-fresh-proof.mjs`: golden vector produced by the real SQL on PostgreSQL 16; the JavaScript verifier must reproduce the database's hashes exactly, detect edits, removals, forged timestamps and mixed authors, and the migration must keep the guarantees.

Tested on a throwaway PostgreSQL 16: the migration applies twice; a client cannot forge author, sequence, time or hash; invalid JSON and unknown kinds are rejected; nobody can update, delete or truncate; anonymous readers can read and not write; two authors have independent chains; tampering (done by disabling the trigger, as an operator could) is detected by both the SQL checker and the JavaScript verifier.

## 4. What it does not do (stated plainly)

- **It does not protect against whoever controls the database.** An operator who disables the triggers can rewrite history; the chain will then fail verification, but only for people who kept a copy or a published digest. The fix is to publish `proof_daily_digest` outside Fresh's control (a public log, a partner, a newspaper). Until that is done, say "tamper-evident for anyone who holds a copy", not "tamper-proof".
- **It does not prove a claim is true.** It proves who recorded what, and when.
- **Records are permanent.** A record cannot be edited or erased, so the product must warn before posting and must never put private data in a body. Account deletion does not delete records (there is no foreign key on purpose); this needs a clear policy and legal review before launch.
- The chain is per author. It orders an author's own records; it does not order records across authors beyond the server timestamp.

## 5. Roadmap (multi-year, each step needs your approval)

1. **Now:** core table and verifier (this change). Owner reviews and applies the migration.
2. **Prediction Ledger on Proof:** a Short can carry a `prediction` record; resolution is a second record that points to the first. See `FRESH_PREDICTION_LEDGER_DESIGN.md` (its table design is replaced by this one).
3. **Machine Access on Proof:** machine principals and scoped credentials; every automated write also writes an `action` record. See `FRESH_MACHINE_ACCESS_DESIGN.md`.
4. **Open specification:** a versioned written standard and schema registry per `kind`, so other companies can write compatible records.
5. **External anchoring:** publish the daily digest to a place Fresh does not control.
6. **Signatures:** authors (and machines) sign records with their own keys, so even Fresh cannot forge a record in someone's name.
7. **Federation:** other operators run compatible ledgers and cross-verify each other.
8. **Reputation views:** track records (hit rate, calibration, reliability of machine agents) computed only from verifiable records.

## 6. Decisions needed from the owner

1. Approve applying `20261110100000_fresh_proof_core.sql` to production (new table only; nothing existing changes).
2. Where should the daily digest be published, and by whom, so it is outside Fresh's control?
3. Policy for permanence: wording shown before posting, and what happens on account deletion (needs legal review).
4. Which step comes next: Prediction Ledger on Proof, or Machine Access on Proof.
