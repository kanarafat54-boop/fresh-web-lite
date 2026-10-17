# Fresh AI learning loop (no outside AI)

1. A user presses the thumbs-down on an answer. Fresh AI asks what it should have said.
2. If the user types a correction and then explicitly confirms sharing, the question, the
   answer and the correction are stored in `fresh_ai_preference_pairs` with
   `safety_checked = false`. Nothing is shared without that confirmation.
3. The owner reviews corrections in the Supabase SQL editor:

```sql
select id, created_at, prompt, preferred_output, rejected_output
from public.fresh_ai_preference_pairs
where coalesce(safety_checked, false) = false
order by created_at;
```

4. Approve a good one. This adds it to Fresh AI knowledge, searchable immediately:

```sql
select public.approve_fresh_ai_correction('PASTE-THE-ID-HERE');
```

5. Reject a bad one:

```sql
delete from public.fresh_ai_preference_pairs where id = 'PASTE-THE-ID-HERE';
```

Approved corrections are also high-quality training pairs for `fresh-unified-1`. Only rows with
`safety_checked = true` should ever be used for training.
