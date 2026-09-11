# Fresh AI Universal Power Fabric

## Purpose

Fresh AI keeps the powers already present across the Fresh AI architecture while moving them behind one canonical capability contract.

The migration principle is **transfer, normalize, combine — do not discard**.

## Canonical power domains

- Understanding
- Conversation
- Knowledge & Search
- Reasoning
- Memory
- Creation
- Action & Agents
- Communication
- Media Intelligence
- Engineering
- Automation
- Verification & Truth
- Safety & Governance

## Runtime direction

```text
Fresh AI Surface
      ↓
Universal Context
      ↓
Universal Power Fabric
      ↓
Intelligence Gateway
      ↓
Kernel / Memory / Research / Truth
      ↓
ARA6 / Agents / Tools / Providers
      ↓
Verification
```

## Migration rule

Existing implementations remain usable while adapters move their capabilities into the canonical fabric. No existing capability should be removed merely because a duplicate contract exists.

The fabric is a capability contract and resolver. It does **not** claim that every listed provider is already production-wired.

## Governance

The fabric never silently approves an action requiring approval. Execution remains behind the existing Fresh AI gateway, ARA6 and verification boundaries.

## Verification

`node scripts/verify-fresh-ai-power-fabric.mjs` checks that the canonical power set, resolver, normalization and integrity verifier exist and that Fresh AI Everywhere points at the canonical gateway contract.
