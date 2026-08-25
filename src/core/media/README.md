# Fresh Media Operating System

This layer defines shared media primitives without replacing existing media features.

## Adoption rule

Feature modules remain authoritative while progressively adopting these contracts. A new media capability should extend an existing capability through these primitives instead of creating a second implementation.

## Core dimensions

- media identity and kind
- provenance and derivative lineage
- creator-controlled derivative policy
- knowledge descriptors
- accessibility capabilities
- universal interaction vocabulary
- durable vs ephemeral event semantics

## Scale rule

High-frequency interactions, especially Live reactions, must not imply one durable database write per visual event. Ingestion, deduplication, aggregation, realtime fan-out, and durable persistence are separate responsibilities.
