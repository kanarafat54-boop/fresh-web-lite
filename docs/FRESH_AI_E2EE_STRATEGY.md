# Fresh AI — End-to-End Encryption Strategy (#TRUEMODE)

## Honest threat model

Fresh AI today processes requests on the server (`/api/ai/ask`, `/api/ai/stream`).
That means **true server-blind E2EE of the live AI channel is incompatible with server-side inference**: if the server must interpret, research, or answer, it must see plaintext for that request.

Professional systems separate three layers:

| Layer | Goal | Server can read? |
|-------|------|------------------|
| **Transport TLS** | Protect network path | Yes (terminates TLS) |
| **At-rest encryption** | Protect stored history & memory if DB is leaked | No (ciphertext only) |
| **True E2EE / client-only AI** | Server never sees content | No (requires on-device model) |

This repository implements **Layer 2 (at-rest)** first, with contracts that can later support Layer 3 when a local `fresh-unified-1` checkpoint runs on-device.

## Design principles

1. **Keys never leave the client** in plaintext. Server stores only ciphertext + public metadata.
2. **Backward compatible**: existing plaintext rows remain readable; new rows can be encrypted envelopes.
3. **User-controlled unlock**: passphrase or device key unlocks a master key via PBKDF2 + AES-GCM.
4. **No false claims**: UI must not say “end-to-end encrypted AI chat” while the server still processes plaintext requests.
5. **Forget works**: deleting a vault key or calling forget removes decryptability of ciphertext.

## Envelope format

```json
{
  "v": 1,
  "alg": "AES-GCM-256",
  "kdf": "PBKDF2-SHA256",
  "salt": "<base64>",
  "iv": "<base64>",
  "ct": "<base64>",
  "aad": "fresh-ai-memory|conversation|artifact",
  "kid": "<key id>"
}
```

- `aad` binds ciphertext to a purpose so memory ciphertext cannot be replayed as conversation content.
- `kid` allows key rotation without rewriting the whole store at once.

## Key hierarchy

```
User passphrase / device secret
  → PBKDF2 (100k+ iterations, unique salt)
    → Master Key (AES-256)
      → per-record content encryption (random IV each time)
```

Optional later: wrap master key with WebAuthn / platform authenticator for passwordless unlock.

## What is encrypted at rest

- `fresh_ai_conversation_turns.content`
- `fresh_ai_memory.content`
- Optional: media metadata prompts that contain private context

**Not encrypted** (needed for indexing / routing):

- `user_id`, `conversation_id`, `role`, timestamps, `route`, `model_id`
- Pipeline event stage names (no private content)

## Migration path

1. Ship crypto module + vault unlock UI.
2. New writes use envelopes when vault is unlocked.
3. Reads: if payload starts with envelope marker, decrypt; else treat as legacy plaintext.
4. Optional bulk re-encrypt of legacy rows after user unlocks.
5. Future: client-side inference path when checkpoint is available → true E2EE mode.

## Production gates before marketing “E2EE”

- [ ] Unit tests for encrypt/decrypt round-trip and AAD mismatch failure
- [ ] Key export/import and recovery flow tested
- [ ] Supabase RLS still enforced on ciphertext rows
- [ ] No server logs of decrypted content
- [ ] Clear UI copy: “Encrypted at rest” vs “Server cannot read”
- [ ] Security review of KDF parameters and storage of wrapped keys

## Non-goals (for this phase)

- Claiming that live Gemini/server gateway calls are E2EE
- Homomorphic encryption of prompts for cloud models
- Fabricating a trained model to justify “on-device E2EE AI”
