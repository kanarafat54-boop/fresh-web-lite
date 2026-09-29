# Fresh Flow — 40-Step Execution Plan

This is the next implementation sequence for the Fresh Flow platform. The objective is to make the large architecture behave as one bounded, observable, privacy-aware runtime rather than a collection of independent screens.

## Execution tracks

- 1. Unify the runtime item contract across every Fresh Flow world.
- 2. Keep one active media owner per viewport.
- 3. Bound every initial feed request to a small page.
- 4. Add shared cursor pagination.
- 5. Add guarded concurrent-load state to prevent duplicate fetches.
- 6. Prefetch before the user reaches the queue boundary.
- 7. Cancel or ignore stale feed requests after world/discovery changes.
- 8. Keep Shorts vertical and immersive.
- 9. Keep Long Videos cinematic and structurally separate.
- 10. Keep News / Posts information-first and readable.
- 11. Keep VR / AR environment-first with contextual controls.
- 12. Keep Podcasts audio-first with persistent playback state.
- 13. Keep Others extensible for emerging formats.
- 14. Route all active-item changes through the runtime.
- 15. Route durable likes, saves, follows and shares through the interaction bus.
- 16. Keep ephemeral UI events separate from durable interactions.
- 17. Make interaction persistence match the real database uniqueness model.
- 18. Add telemetry buffering with bounded memory.
- 19. Batch telemetry instead of creating one network request per gesture.
- 20. Measure impression, play milestones, completion and skip.
- 21. Feed completion and skip signals into discovery scoring.
- 22. Add freshness, relevance, affinity and diversity signals.
- 23. Never allow ranking to bypass safety/moderation.
- 24. Add media-processing states from ingest through publish.
- 25. Keep transcoding, captions, dubbing and repurposing off the browser.
- 26. Enforce media reference safety before playback.
- 27. Add realtime invalidation for media and interaction changes.
- 28. Keep user-private realtime topics distinct from public media topics.
- 29. Verify Broadcast authorization before treating private realtime as complete.
- 30. Add offline/slow-network media policies.
- 31. Prefer metadata-first loading on constrained connections.
- 32. Bound concurrent media downloads.
- 33. Retain only a small neighborhood around the active item.
- 34. Add deterministic ordering for feed pages.
- 35. Keep public creator identity limited to the safe profile surface.
- 36. Keep secrets and privileged database operations server-side.
- 37. Add CI checks for runtime contracts and media performance.
- 38. Run database security/performance advisors after schema changes.
- 39. Verify Railway, Vercel and GitHub status before calling production ready.
- 40. After the foundation is stable, expand creator tools, recommendations, realtime communities, marketplace/rights workflows and AI-assisted media creation without changing the core runtime contract.

## Operating laws

- Minimal surface, massive underlying system.
- One active media owner per viewport.
- Never download the entire feed.
- Safety and privacy constraints are upstream of ranking.
- Durable state and ephemeral realtime are different systems.
- Heavy media processing belongs to backend/worker infrastructure.
- Client code never receives privileged secrets.
- Every production claim requires verification.

## Current implementation checkpoint

The runtime fabric, discovery contract, media policy, realtime contract, telemetry buffer, media pipeline, interaction bus, bounded media loading, Shorts integration and News/Posts integration are already wired into the repository. This document is the execution map for the next expansion rather than a replacement for working code.
