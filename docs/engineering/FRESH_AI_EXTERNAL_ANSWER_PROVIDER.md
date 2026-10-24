# Fresh AI architecture decision: no answer-provider clone

The optional OpenAI-compatible answer adapter previously proposed on this branch has been removed. Fresh AI must not define its core answer path as a drop-in copy of another provider's API or treat a compatible response shape as intelligence.

Do not configure `FRESH_ALLOW_EXTERNAL_ANSWER_PROVIDER`, `FRESH_EXTERNAL_ANSWER_URL`, `FRESH_EXTERNAL_ANSWER_API_KEY`, or `FRESH_EXTERNAL_ANSWER_MODEL` for this removed adapter. These variables are not part of the intended Fresh AI architecture.

Fresh AI can still integrate authorized external services for specific capabilities—such as web search, licensed datasets, speech, or media processing—when each integration has a clear purpose, permissions, provenance, security controls, and tests. That is different from outsourcing the whole answer engine and presenting it as Fresh's own intelligence.

The active direction is documented in [FRESH_AI_CAPABILITY_LEARNING_AND_MULTIPLICATION.md](./FRESH_AI_CAPABILITY_LEARNING_AND_MULTIPLICATION.md).
