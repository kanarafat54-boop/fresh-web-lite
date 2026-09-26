# Fresh Flow — Media Operating Architecture

> **Massive underneath. Minimal on the surface.**

Fresh Flow is a **media operating architecture**, not a single video section.

## Three layers

| Layer | Question | Surface rule |
|-------|----------|--------------|
| **A · Media Director** | What am I consuming? | **Flow Switch** — summoned, never permanent six-tile chrome |
| **B · Discovery Director** | How is content selected? | Contextual chips per world |
| **C · Content Experience** | How do I interact? | Contextual; collapses when idle |

**Design law:** the interface must never expose the entire architecture merely because the architecture exists.

## Six media worlds

| World | Surface | Route |
|-------|---------|-------|
| Fresh Short | Immersive vertical | `fresh-flow` |
| Long Videos | Cinematic player | `fresh-flow-long-videos` |
| News / Posts | Information | `fresh-flow-news-posts` |
| VR / AR | Environment | `fresh-flow-ar-vr` |
| Podcasts | Audio-first | `fresh-flow-podcasts` |
| Others | Emerging formats | `fresh-flow-more` |

Each world defines its own **discovery** modes (For You, Trending, Learn, …) in `src/features/fresh-flow/core/freshFlowArchitecture.ts`.

## Universal services (cross-world)

Search · Voice · Translate · Share · Save · History · Follow · Notifications · Fresh AI

These stay global; they are not duplicated as permanent chrome inside every world.

## Code map

| Piece | Path |
|-------|------|
| Architecture source of truth | `core/freshFlowArchitecture.ts` |
| Flow Switch (Layer A UI) | `components/FreshFlowSwitch.tsx` |
| Hub shell | `FreshFlowHub.tsx` |
| Short experience | `components/FreshFlowShortsExperience.tsx` |
| Long / VR / Pod / Others workspace | `components/FreshFlowMediaWorkspace.tsx` |
| News / Posts | `components/FreshFlowNewsPosts.tsx` |

## UX sequence (Short entry)

1. **0–5s** — content only (minimal UI)
2. Content settled — discovery + interaction appear contextually
3. User summons **Flow Switch** when changing media world

Fresh Short remains the immersive entry; Fresh Flow remains the larger media universe.
