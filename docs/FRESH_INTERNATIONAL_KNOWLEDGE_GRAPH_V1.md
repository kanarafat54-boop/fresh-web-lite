# Fresh International Knowledge Graph V1

## Purpose

Fresh should understand the world as a connected, multilingual, time-aware evidence graph rather than as a flat collection of text. Wikidata is the first international structured-knowledge intake candidate because its official documentation states that structured data in the main, Property, Lexeme and EntitySchema namespaces is released under CC0. This is an intake candidate, not an automatic production-training approval.

## Architecture

```text
International Sources
  -> Source Registry
  -> Entity Resolution
  -> Fresh Knowledge Graph
       |-- entities
       |-- aliases / multilingual labels
       |-- relationships
       |-- claims
       |-- qualifiers / time
       |-- references
       |-- provenance
       |-- confidence / validation state
       |-- contradiction links
       |-- jurisdiction / locale
  -> Retrieval + Reasoning
  -> TRUEMODE Truth Decision Orchestrator
  -> Fresh AI
```

## Design principles

1. **International by default** — knowledge must support countries, languages, cultures, institutions and domains beyond a single national perspective.
2. **Graph first, text second** — structured entities and relationships are first-class objects; text is supporting evidence, not the graph itself.
3. **Evidence attached to claims** — every consequential claim should retain source and provenance information when available.
4. **Temporal truth** — facts can have start/end validity and must not be treated as timeless.
5. **Contradiction is data** — conflicting claims are preserved and evaluated; they are not silently overwritten.
6. **Multilingual identity** — one entity can have many language labels and aliases without becoming multiple entities.
7. **Jurisdiction aware** — laws, standards, rights and other jurisdiction-sensitive claims retain their jurisdiction.
8. **No blind trust** — graph membership does not equal truth. Fresh's truth layer evaluates evidence, independence, provenance, temporal validity and confidence before consequential action.
9. **Fresh-owned semantic layer** — external sources enrich the graph, but Fresh maintains its own canonical IDs, mappings, provenance and validation state.
10. **Rights-aware ingestion** — source licensing and acquisition rights remain attached to every imported dataset/version.

## V1 entity model

Minimum entity types:

- Person
- Organization
- Place
- Country / territory
- Language
- Work / creative work
- Scientific concept
- Event
- Product / technology
- Software
- Dataset
- Institution
- Species / biological entity
- Legal / regulatory concept
- Time period
- Measurement / unit

Minimum relationship types:

- instance-of
- subclass-of
- part-of
- located-in
- member-of
- founded-by
- owned-by
- created-by
- developed-by
- based-on
- related-to
- predecessor-of
- successor-of
- occurs-at
- occurs-during
- uses-language
- has-license
- governed-by
- cited-by
- supports
- contradicts

## Claim record

A Fresh claim should be representable as:

`subject -> predicate -> object/value`

with optional:

- claim ID
- source IDs
- reference URLs
- source publication/observation date
- valid-from / valid-until
- jurisdiction
- language
- provenance chain
- confidence
- validation status
- supporting claim IDs
- counter-evidence IDs
- contradiction group
- last verified timestamp

## Wikidata V1 role

Wikidata should initially serve as an **international structured knowledge foundation**, not as Fresh's final worldview and not as an automatic model-training corpus.

Use the official dump/data-access routes for large-scale acquisition rather than uncontrolled live scraping. Record the exact dataset version, acquisition date, source URL, file hash, transformation version and license evidence.

The imported graph should be normalized into Fresh's own schema so that Fresh can later combine:

- Wikidata structured knowledge
- directly licensed professional datasets
- authoritative institutional sources
- Fresh-owned knowledge
- user-authorized private knowledge
- Fresh research observations

without making any source inherently authoritative.

## Training versus knowledge graph

The knowledge graph and the model-training corpus are separate assets.

- **Knowledge graph:** continuously updateable, source-linked, multilingual, temporal and queryable.
- **Training corpus:** versioned, legally authorized, privacy/safety/quality reviewed and explicitly promoted.
- **Model weights:** trained only from approved training data.

A graph update must never silently become a model-training update.

## V1 gate

The Wikidata candidate is currently blocked from production promotion until Fresh completes legal review and corpus privacy, safety, quality and deduplication checks. No external source bytes are claimed to have been acquired by this commit.
