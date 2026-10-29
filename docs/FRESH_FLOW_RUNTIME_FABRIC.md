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
9. **Interactions** — durable interactions use the existing universal interaction persistence path; ephemeral realtime messages are separate.
10. **Realtime** — the client event bus uses Supabase Broadcast. Supabase's current guidance recommends Broadcast over Postgres Changes for scalable realtime use; Presence is reserved for slow-changing presence state. 
11. **Creator/media processing** — ingestion, moderation, transcoding, thumbnails, captions, audio separation, dubbing, repurposing and publishing are modeled as bounded stages. Actual heavy rendering remains a backend/worker concern.
12. **Recommendation/context** — ranking is a replaceable policy layer, not coupled to UI rendering.
13. **Security/performance** — sensitive financial calls stay server-side; public profile reads use the safe profile boundary; media loading is bounded.

## Universal scope contract

The full open-world product scope and logical architecture are specified in [`FRESH_FLOW_UNIVERSAL_MEDIA_ARCHITECTURE.md`](./FRESH_FLOW_UNIVERSAL_MEDIA_ARCHITECTURE.md). This runtime fabric is a delivery/runtime layer, not a definition of all media categories. Six destinations remain entry points; capability registration and specialized adapters must support additional present and future formats without a navigation rewrite.

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


## Current implementation boundary

The new runtime fabric is deliberately additive. Existing Shorts, Long Video, News/Posts, AR/VR, Podcasts and Others components can adopt these contracts without a destructive rewrite.

Heavy media processing is not faked in the browser: the UI owns job intent and status; workers own transcoding/rendering/repurposing.

Realtime authorization must remain explicit. Supabase documents private Broadcast authorization through RLS; the repository keeps the realtime layer isolated so channel authorization can be hardened without coupling it to content persistence.
