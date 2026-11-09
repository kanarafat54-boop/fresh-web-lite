# Fresh Prediction Ledger — Design for Review

Status: **proposal, nothing built, no migration written.** This is for the owner to review before any code.

## 1. What it is

A creator publishes a dated **prediction or promise** in a Short ("this team wins on 14 Dec", "I will launch by 1 March", "this price will be lower by June"). Fresh **locks the wording and the date** so the creator cannot change it afterwards. When the date arrives, the outcome is recorded with evidence. Each creator then has an honest, public track record based on being right, not on follower count.

A sealed variant lets a creator publish a Short that stays hidden until a chosen date.

Why it is worth testing: it is cheap, needs no AI, no outside service and no location data, and it gives people a reason to talk about Fresh that other platforms cannot copy easily because their feeds reward attention, not accountability.

## 2. Rules that make it trustworthy

| Rule | Why |
|---|---|
| The statement, the resolution date and the resolution criteria are fixed at publish time. Editing is not possible; **withdrawing** is allowed but stays visible and counts against the record. | Otherwise creators quietly delete misses. |
| The server timestamps every entry. The creator's device clock is never used. | A creator cannot backdate. |
| A prediction must say **how it will be judged** (a measurable outcome and, where possible, a named source). Vague entries ("things will get better") are rejected at publish. | Unfalsifiable claims make a meaningless record. |
| A prediction can state a **probability** (for example 70%). Records show calibration, not only wins. | A 70% claim that fails is not wrong in the same way a 99% claim is. |
| The creator may **not** be the only judge of an outcome that others can check. See section 4. | Self-marking is the easiest way to cheat. |
| No hit-rate is shown until a creator has at least 5 resolved entries. | Avoids misleading numbers from one lucky call. |
| Predictions about harm to named private people, self-harm, betting odds and financial advice are not allowed. They can be reported through the existing report flow. | Safety and legal exposure. |

Fresh states clearly that entries are **opinions and commitments, not advice**, and that the ledger is not a betting or trading product.

## 3. What a viewer sees

- On a Short that carries a prediction: a **Prediction** card with the locked wording, the date, how it will be judged, the stated probability and the current state (Open, Due, Hit, Miss, Disputed, Withdrawn).
- On a creator profile: a **Track record** tab with counts, hit rate (once 5 are resolved), a calibration summary and the list of entries, each linking to its Short.
- A page for **upcoming resolutions** ("due this week") so people come back on the date.
- Notifications to followers when an entry they follow resolves (fits the existing notification categories).

## 4. Who decides the outcome (owner decision needed)

| Option | How it works | Trade-off |
|---|---|---|
| A. Creator resolves, with required evidence link, and a **challenge window** (7 days) where viewers can dispute | Simple, no staff needed | Needs reviewing disputes; early on that falls to the owner |
| B. A named reviewer (owner or moderators) resolves every entry | Most reliable | Does not scale; slows launch |
| C. Automatic from a data source (scores, prices) | Objective, instant | Needs a data provider per topic; only some entries qualify |

Recommended start: **A for launch with a small group**, with the owner resolving disputes, and B for any disputed entry.

## 5. Data model (proposed, not applied)

Two additive tables, owner-only write rules, public read of published entries:

- `short_predictions`: `id`, `short_id` (unique), `author_id`, `statement` (≤280 chars), `criteria` (≤500), `source_url` (optional), `probability` (1–99, optional), `resolves_at`, `published_at` (server default), `status` (`open`, `hit`, `miss`, `disputed`, `withdrawn`, `void`), `resolved_at`, `resolution_note`, `resolution_url`.
- `short_prediction_disputes`: `id`, `prediction_id`, `disputer_id`, `reason`, `created_at`.

Integrity enforced in the database, not the app: a trigger rejects any update to `statement`, `criteria`, `probability`, `resolves_at` and `published_at` after publish; status may only move along allowed transitions; a creator cannot resolve before `resolves_at`; entries cannot be deleted by their author (withdraw instead). I would test the migration on a throwaway Postgres, as with the earlier slices, and leave applying it to the owner.

**Honest limit:** "cannot be edited" means creators cannot change it. The owner, who controls the database, still can, so Fresh must not claim it is tamper-proof. An optional later step is publishing a daily hash of all entries somewhere the owner does not control.

## 6. Sealed Shorts (second phase)

A Short can be published with `reveal_at`. Until then it is visible only to its author, and the public sees a locked card with the date. Hiding must be enforced by row security, not by the app, so the video URL is not exposed early; because videos live in storage, the storage object also needs a non-public path until reveal. This is why it comes after the ledger.

## 7. Phases

1. **Ledger MVP:** tables, publish flow (a "Make this a prediction" step), the card, the profile tab, resolution with evidence and a challenge window. Small invited group.
2. **Upcoming page, notifications, calibration view.**
3. **Sealed Shorts.**
4. **Public hash anchoring** and automatic resolution for suitable topics.

## 8. How we will know it works

- Share of published predictions that are specific enough to resolve.
- Share that resolve on time, and the dispute rate.
- Return visits on resolution dates.
- Reports about predictions per 1,000 entries.

If people publish predictions but nobody comes back on the resolution date, the idea does not have the pull we think, and we stop before building phases 3 and 4.

## 9. Decisions needed from the owner

1. Who resolves outcomes at launch (section 4)?
2. Is a small invited creator group available for the first phase?
3. Are there topics Fresh will not allow (beyond the safety list above)?
4. Is the wording in section 2 about advice and betting acceptable, or should it be reviewed by a lawyer before launch? (I am not a lawyer; this needs real legal review.)
