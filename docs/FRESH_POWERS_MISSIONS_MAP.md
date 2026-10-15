# Fresh powers and missions map

Audit date: 2026-10-12. Nothing here removes a power, ecosystem or system. Each
item is sorted, matched to the code and database that carries it, and given an
honest status. "Wired" means confirmed in `api/ai/ask.ts`. "Declared" means the
power exists in `FreshAIUniversalPowerFabric.ts` but runtime use is unverified.

## 1. The 14 powers, matched to the master matrix

| Power | Matrix ecosystems | Code anchor | Status |
|---|---|---|---|
| understanding | 1, 2 | `interpret()` in `api/ai/ask.ts` | Wired |
| conversation | 4 | conversation ledger, `fresh_ai_conversations` | Wired, E2EE sealing pending |
| knowledge-search | 7 | `/api/research/search`, `fresh_ai_knowledge` | Wired (knowledge retrieval added by this audit) |
| reasoning | 2 | reasoning engine | Declared |
| memory | 2 | `fresh_ai_memory` | Wired |
| creation | 5, 17 | image generation in `ask.ts` | Partial |
| native-generation | 5 | native dimensional engines | Wired |
| action-agents | 15, 16 | Ara6 default agents | Declared (agents imported) |
| communication | 4, 13 | none confirmed | Declared |
| media-intelligence | 3 | none confirmed | Declared |
| engineering | 15, 16 | none confirmed | Declared |
| automation | 16 | none confirmed | Declared |
| verification-truth | 32, 44 | gateway verification, truth states | Wired |
| safety-governance | 22, 33, 45 | approval flag in governance object | Wired |

The doc `FRESH_AI_UNIVERSAL_POWER_FABRIC.md` lists 13 domains; code has 14
because `native-generation` was added. Both are kept.

## 2. Ecosystem status (from the master matrix)

In progress: 1 Core Foundation, 2 Fresh Intelligence, 3 Fresh Flow, 5 Creation,
10 Financial, 17 Creator Economy. Every other ecosystem is planned. Fresh AI
must describe planned items as planned, never as available.

## 3. Overlapping systems (kept, not deleted)

These parallel structures exist in the live database. Recommended canonical
choice is listed; migrate readers to it with adapter views before retiring any.

| Area | Systems found | Recommended canonical |
|---|---|---|
| Money | `wallets`/`wallet_balances`/`wallet_transactions`, `ledger_*`, `treasury_*` | `treasury_*` |
| Marketplace | `marketplace_listings`, `fresh_marketplace_listings` | `fresh_marketplace_listings` |
| AI memory | `fresh_ai_memory`, `fresh_memories` | `fresh_ai_memory` |
| Identity | `users`, `user_public_profiles`, `universal_profiles`, `profile_details` | `users` as source, others derived |

## 4. Missions

`src/core/fresh-ai/mission/missionManager.ts` is in-memory and resets on every
serverless cold start. It is untouched. `missionStore.ts` (new) persists missions
to `fresh_ai_missions` with per-user RLS. Each mission can carry an `ecosystem`
and a `power` so it ties back to this map.

## 5. Training Fresh AI

Two different things share the name:

1. Live Fresh AI: a Gemini-backed gateway. It improves through grounding data,
   not weights. This audit seeds `fresh_ai_capabilities` (14), `fresh_ai_knowledge`
   (74 platform facts: 16 hand-written + 58 generated from the master matrix) and `fresh_ai_training_examples` (instruction, safety,
   preference and evaluation examples) and makes `api/ai/ask.ts` retrieve from
   `fresh_ai_knowledge`.
2. `fresh-unified-1`: the from-scratch model. It is at pipeline smoke-test stage
   (46 synthetic examples). It needs a large authorized corpus and GPUs before it
   is useful. The seed deliberately does not touch `data/` so the training
   provenance contracts keep passing.

To teach Fresh AI something new, add a row to `fresh_ai_knowledge` with
`project_id = 'fresh-web-lite-platform'` and `user_id = null`, plus one or two
`fresh_ai_training_examples`.

## 6. How Fresh AI answers (independent)

Verified in code: the gateway uses Fresh's own kernel. This bundle removes the only outside
AI call in the API layer (Gemini in `api/ai/ask.ts`), so Fresh AI no longer depends on
Gemini, DeepSeek or any other provider. The kernel's native answer layer returns templates
when it has no evidence; with evidence it answers from it. `ask.ts` now retrieves
`fresh_ai_knowledge` rows on every request and the kernel answers directly from them when
no fresh evidence is needed. See `docs/FRESH_AI_INDEPENDENCE_ROADMAP.md` for the stages
toward a fully self-trained model.

## 7. Open items not fixed by this bundle

- `users.subscription`, `users.stats` and `users.security` are still editable by
  the row owner. Lock them once client usage is checked.
- `/api/ai/ask` accepts anonymous callers. Require auth or add a rate limit.
- About 25 migrations are no-op stubs. Run `supabase db pull` for a real baseline.
- Leaked-password protection is off (Supabase Auth settings).
- Legacy Vercel integration variables point at another Supabase project. Remove them.
- README is stale (20 ecosystems, "no database").
