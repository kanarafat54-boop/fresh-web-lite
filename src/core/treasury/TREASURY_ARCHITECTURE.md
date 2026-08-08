# Fresh Treasury

This directory defines the financial domain boundary for Fresh Web Lite.

Principles:

- User funds, platform funds, and owner funds are separate accounting scopes.
- Ledger balances are derived from immutable journal entries, not UI state.
- Monetary quantities use integer minor units; floating-point arithmetic is prohibited.
- Revenue allocation is explicit and auditable.
- Client code never authorizes privileged owner transfers.
- External settlement providers are adapters, not the source of truth for Fresh's ledger.
- No balance is considered real until a trusted ledger and settlement boundary records it.
