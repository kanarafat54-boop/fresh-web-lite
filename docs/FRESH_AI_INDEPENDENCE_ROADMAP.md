# Fresh AI independence roadmap

Principle: no outside AI model at runtime. Not Gemini, DeepSeek, OpenAI, Claude or any other.
Fresh AI reasons, remembers, retrieves, verifies and creates with Fresh-owned code and data.

## What is already independent (verified in code)
- Goal understanding (`FreshGoalUnderstanding`), kernel, reasoning and verification layers.
- 11 native dimensional engines (`FreshNativeDimensionalEngines`) and the native generation
  fabric, both asserted network-free and provider-independent by CI.
- Truth states, TRUEMODE gating, per-user memory, per-user sealed conversations.
- Knowledge: `fresh_ai_knowledge` (74 rows live: 16 hand-written + 58 generated from the
  master matrix) and `fresh_ai_training_examples` (138 live).
- `fresh-unified-1` is declared `providerIndependent: true`, `externalProviderRequired: false`,
  `weightsStatus: "training-required"`. That last field is the honest status.

## What the v3 bundle changes
- Removes the Gemini interpret/answer code from `api/ai/ask.ts`. The endpoint can no longer
  send any text to an outside model, even if an environment variable is set by mistake.
- Grounds answers in Fresh's own knowledge on every request.
- Keeps `FRESH_ALLOW_EXTERNAL_ANSWER_PROVIDER` unset. CI still requires that opt-in string
  in the gateway, so leave the gateway guard in place and never set the variable.

## Remaining non-AI dependencies (decide per item)
- Tavily web search (`TAVILY_API_KEY`): a search data API, not an AI model. Keep for live
  facts, or replace later with a Fresh crawler and index.
- Supabase, Vercel, GitHub: infrastructure.
- Delete from Vercel: `GEMINI_API_KEY`, `OPENAI_API_KEY`, `CLAUDE_API_KEY`.
- Inert placeholder connectors for openai, anthropic, google-gemini and meta-ai are
  registered in `src/features/ai/intelligence/registerConnectors.ts`. They make no calls.
  Remove them if you do not want those names shown in the UI.

## Stages
1. Knowledge-first assistant (this bundle). Accurate and honest, but not conversational.
2. Better retrieval with no outside AI: Postgres full-text search (`tsvector` + GIN index +
   `websearch_to_tsquery` ranking) on `fresh_ai_knowledge`. Then ingest every doc in `docs/`
   with a generator like `scripts/generate-fresh-knowledge-from-matrix.mjs`.
3. Learning loop: thumbs up/down in `fresh_ai_feedback` creates candidate knowledge and
   preference pairs; the owner approves them (AI Governance already requires approval).
4. Train `fresh-unified-1`: needs a large first-party or consented corpus with provenance,
   a tokenizer, and GPU time. A small model trained on Fresh data can answer Fresh questions
   fluently. General open-ended conversation at the level of major assistants needs billions
   of tokens and very large compute, which is not realistic soon. Plan for domain-level
   independence first.
