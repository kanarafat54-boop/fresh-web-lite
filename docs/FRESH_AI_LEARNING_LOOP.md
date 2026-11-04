# Fresh AI learning loop (no outside AI, owner approves everything)

1. A user presses the thumbs-down on an answer. Fresh AI asks what it should have said.
2. If the user types a correction and then explicitly confirms sharing, the question, the answer
   and the correction are stored in `fresh_ai_preference_pairs` with `review_status = 'pending'`
   and `safety_checked = false`. Nothing is shared without that confirmation.
3. **Nothing becomes knowledge until the owner approves it.** Approved corrections are shown to
   every user, so each one is screened first (see below).

## Reviewing (administrator only)

`GET /api/ai/corrections?status=pending|approved|rejected&limit=25` lists corrections with the
screening result for each. The submitter's identity is never returned.

`POST /api/ai/corrections` with `{ "id", "decision": "approve" | "reject", "note", "editedText", "acknowledgeFlags" }`:

- **approve** creates (or updates) a Fresh AI knowledge row, marked PROBABLE with confidence 0.8.
  A question that was approved before updates its existing row instead of creating a duplicate.
- **editedText** lets the owner fix wording or remove personal details before approving. The original
  is kept in `submitted_output`; `preferred_output` holds only what was approved, so training never
  sees text the owner removed.
- **reject** keeps the row as evidence (`review_status = 'rejected'`) instead of deleting it.
- Every review records who, when and why (`reviewed_by`, `reviewed_at`, `review_note`) and which
  knowledge row it produced (`knowledge_id`).

Reviewing also updates the matching consent record in `fresh_ai_feedback` (same request and user), so the
consent ledger and the preference pair never disagree. Corrections arrive through the explicit,
versioned training-consent flow described in `FRESH_AI_CONTINUOUS_LEARNING_LOOP.md`.

Both routes share the existing `/api/ai/feedback` serverless function (the project is at its function
limit), through the rewrite in `vercel.json`.

## Screening

- **Hard flags** block approval until the text is edited (the database repeats these checks, so the
  SQL editor is protected too): API keys, tokens, private keys, connection strings with passwords,
  card-like numbers, and text shorter than 10 or longer than 2000 characters.
- **Soft flags** need `acknowledgeFlags: true` to approve: email addresses, phone numbers, links,
  and wording that tries to instruct the assistant.

## SQL editor path (still works)

```sql
select id, created_at, prompt, preferred_output from public.fresh_ai_preference_pairs
where review_status = 'pending' order by created_at;

select public.approve_fresh_ai_correction('PASTE-THE-ID-HERE');
select public.review_fresh_ai_correction('PASTE-THE-ID-HERE', 'reject', null, 'reason', null);
```

## Applying

Migrations `20261023100000_fresh_ai_correction_review.sql` (additive) and
`20261023100100_fresh_ai_preference_pairs_harden_grants.sql` (optional defense in depth; removes write
privileges nobody uses) are **not** applied automatically. Apply after the migration ledger is
reconciled. Until then the review API answers 503 "migration has not been applied".

Approved corrections are high-quality training pairs for `fresh-unified-1`. Only rows with
`review_status = 'approved'` should ever be used for training.
