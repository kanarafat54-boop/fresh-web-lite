# Fresh Evidence Passport

## Purpose

An Evidence Passport gives a captured research source a durable, independently inspectable identity. A later reader should be able to identify the source, inspect the exact material Fresh recorded, recompute its fingerprint, and understand what the record does and does not establish without relying on the original researcher being present.

## Passport contents

Each `EvidencePassport` contains:

- **Passport identity:** a `FEP-` identifier derived from the source URL, observation time and SHA-256 content fingerprint.
- **Issuer:** Fresh Web Lite Research. This identifies the software that created the record; it is not a third-party digital signature.
- **Source origin:** original URL, publisher domain, title, retrieval provider, publication time when parseable, and Fresh observation time.
- **Captured material:** the exact provider-returned excerpt, or the title when no excerpt was available.
- **Integrity fingerprint:** SHA-256 over a JSON record containing the trimmed title, normalized URL, normalized publisher domain, normalized publication timestamp and captured text.
- **Verification state:** explicitly records that publisher authenticity has not been independently verified and that claim support still requires content review.
- **Limitations:** states that the excerpt is not the complete original page and that a matching digest does not establish factual truth.

## Persistence and immutability

- Passports are stored in `public.fresh_intelligence_evidence_passports`, separately from mutable source metadata.
- Each passport references the canonical `fresh_intelligence_sources` row through `source_id`.
- The graph-plus-passports RPC writes the semantic research graph and passport rows in one database transaction.
- Passport IDs are unique; retries use `ON CONFLICT (passport_id) DO NOTHING`.
- A database trigger rejects updates and deletes. Corrections create a new observation/passport rather than rewriting history.
- RLS is enabled; table access is revoked from `public`, `anon` and `authenticated`. Writes are performed by the server-only service-role adapter.

## How to inspect a passport

1. Open the original source link and compare its title, publisher and available publication date.
2. Read the captured excerpt displayed in the source card.
3. Recreate the fingerprint input using the fields defined above and calculate SHA-256.
4. Compare the calculated digest with `capturedMaterial.digest`.
5. Treat a match as evidence that the captured record is unchanged—not proof that the publisher is genuine or that a claim is true.
6. Check the excerpt against the exact claim. Look for contradictory evidence and original/primary sources before treating the claim as established.

## Current scope

The first implementation passports web-research source records returned by Fresh Research. It does not yet preserve full webpage snapshots, signed publisher credentials, independently witnessed timestamps, or claim-level citation links. Media-specific passports for images, audio and video are future extensions and must preserve their original asset identifiers, metadata and rights context.

## Long-term preservation

Append-only database behavior protects records from ordinary application updates and deletes. It is not, by itself, a guarantee of perpetual survival. Long-term verification requires tested backups and export, retention controls, independent timestamping or signatures, and a way to verify exported passport records without access to the original Fresh account. Those are explicit future requirements—not capabilities claimed by this first version.
