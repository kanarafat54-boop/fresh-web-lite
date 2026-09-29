# Fresh Flow Runtime Fabric

This is the implementation layer beneath the six-world Fresh Flow surface.

## 1–13 completion track

1. **Core runtime** — queue, cursor, active item, bounded prefetch and deterministic state.
2. **Shorts** — vertical immersive playback remains the primary rapid-consumption path; existing Shorts runtime stays the specialized hot path.
3. **Long Videos** — cinematic world with separate playback UX, continue-watching and structured content.
4. **News / Posts** — information world remains distinct from entertainment ranking.
5. **AR / VR** — immersive world; the shell can disappear while the experience owns the viewport.
6. **Podcasts** — audio-first world with persistent playback capability.
7. **Others** — extensible world for formats that do not belong to the first five.
8. **AI search/discovery** — shared discovery contracts provide relevance, freshness, affinity, completion, diversity and safety signals.
9. **Interactions** — comments/reactions/save/share continue using existing domain tables; realtime is separated from persistence.
10. **Realtime** — Supabase Broadcast is the event transport; Presence is reserved for slow-changing presence state. Supabase currently recommends Broadcast over Postgres Changes for scalable realtime use. 
11. **Creator/media processing** — upload/publish remains separated from playback; media URLs are treated as opaque content references.
12. **Recommendation/context** — ranking is a replaceable policy layer, not coupled to UI rendering.
13. **Security/performance** — sensitive financial calls stay server-side; public profile reads use the safe profile boundary; media loading is bounded.

## Runtime laws

- One active media owner per viewport.
- Never download the entire feed.
- Never expose internal implementation details in user-facing surfaces.
- Never let recommendation ranking bypass safety/moderation.
- Never use a client-side secret.
- Persist durable interactions separately from ephemeral realtime events.
- Treat user controls and privacy settings as first-class ranking constraints.

## Realtime contract

Broadcast carries small event envelopes only. Durable state remains in Postgres. Presence is for slow-changing online state, not high-frequency telemetry. 
