# Shorts interaction domain

This layer is intentionally UI-agnostic. It defines shared contracts for reactions, remix/duet lineage, and immersive modes so existing Shorts features can be upgraded without replacing their persistence or presentation layers.

## Invariants

- Existing Shorts behavior remains the source of truth until an equivalent replacement is verified.
- New interactions must be persisted through authenticated services; UI-only state is never treated as success.
- Remix and duet operations retain source lineage.
- Immersive modes are capabilities, not decorative labels.
- Validation lives at the domain boundary before service/database mutation.
