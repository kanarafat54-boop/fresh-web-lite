# Fresh Shorts — Functional Contract

## Purpose

Shorts is a full media interaction ecosystem, not a decorative feed. Every visible control must resolve to a real operation or be explicitly marked unavailable.

## Navigation model

- Vertical navigation moves between media items.
- Horizontal navigation opens creator/context/related-media/evidence spaces.
- Keyboard, button and accessibility controls provide non-gesture equivalents.
- Anti-infinite-scroll controls must allow intentional stopping and quiet mode.

## Media model

The experience must support video, image, gallery, audio, text, live and relationships to long-form media.

## Interaction model

Reactions, comments, replies, saves, reposts, follows and sharing must call real application services and persist where supported. Failed operations must surface an actionable error and must not pretend success.

## Creator model

Upload, recording, editing, drafts, autosave, scheduling, publishing and remix lineage are first-class operations. UI placeholders must not be presented as completed functionality.

## Trust and context

Where applicable, provenance, source/context, AI-generated disclosure, copyright/reporting state and TrueMode evidence/context surfaces must connect to their underlying data/services.

## Functional completion rule

A Shorts feature is complete only when:

UI → route → state → service/API → persistence → result/error state

has been verified end-to-end. Navigation alone is not considered implementation.
