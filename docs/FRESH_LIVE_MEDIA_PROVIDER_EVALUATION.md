# Fresh Live — Free-first media provider evaluation

**Status:** Research only — **no provider activated**, no paid plan, no credentials in repo.  
**Date:** 17 November 2026  
**Purpose:** Choose a candidate for Phase 2 (one real host → independent viewer) under the free-first policy.

Prices and free tiers change; re-verify on vendor sites before committing.

## Evaluation criteria (Fresh Live)

| Criterion | Why it matters |
|-----------|----------------|
| Free or OSS path for development | Blueprint: no paid infra without approval |
| WebRTC SFU for interactive sessions | MVP interactive path |
| Short-lived tokens / server-side auth | Security model |
| Recording optional later | Phase 5 |
| Uganda / constrained networks | Latency, TURN quality |
| Exit path / portability | Adapter keeps provider behind interface |
| Cost cliff when free tier ends | Avoid surprise bills |

## Candidates (summary)

### 1. Cloudflare Realtime SFU — strong free-first cloud option

| Item | Notes |
|------|--------|
| Free tier | **1,000 GB/month** egress free (SFU + TURN share pool); ingest free |
| Billing model | **$0.05/GB egress** after free tier; no per-minute fee |
| Strengths | Generous bandwidth free tier; fits adapter model; Cloudflare edge |
| Risks | API/session model differs from “room minutes” vendors; need hands-on latency tests from target regions |
| Fit for MVP | **High** for free-tier interactive broadcast experiments |

Sources: Cloudflare Realtime pricing & limits docs (2026).

### 2. LiveKit — OSS + free cloud Build tier

| Item | Notes |
|------|--------|
| Free tier (Cloud Build) | ~**5,000 WebRTC minutes**/mo, limited concurrent connections; **hard stop** when exhausted (no silent PAYG on Build) |
| Self-host | **Apache-2.0** server — true free path if you run compute |
| Strengths | Mature SFU, open source exit, good docs, recording/egress products |
| Risks | Cloud free tier is minutes-based and stops cold; Ship is **$50/mo** |
| Fit for MVP | **High** if self-host for dev, or Cloud Build for light tests |

### 3. Daily.co

| Item | Notes |
|------|--------|
| Free tier | ~**10,000 participant-minutes**/mo |
| Beyond free | ~$0.004/min video; rolls to PAYG if billing on file |
| Strengths | Fast integration, Prebuilt UI |
| Risks | Easier to incur cost after free; less “egress-only” predictability |
| Fit for MVP | **Medium** for prototypes; watch billing |

### 4. Agora

| Item | Notes |
|------|--------|
| Free tier | ~**10,000 RTC minutes**/mo |
| Beyond free | PAYG if payment method on file; else suspend |
| Strengths | Scale, global network |
| Risks | Resolution-based pricing complexity; paid path easy to enter |
| Fit for MVP | **Medium** — fine for tests, not free-first long term without controls |

### 5. Self-hosted OSS (mediasoup, Janus, MediaMTX, Pion, Jitsi)

| Item | Notes |
|------|--------|
| License cost | Free |
| Real cost | VPS, bandwidth, ops, TURN (e.g. coturn) |
| Strengths | Full control, no vendor lock |
| Risks | Engineering time; Uganda connectivity / TURN still needed |
| Fit for MVP | **Medium–High** if team accepts ops; slower to first stream |

## Recommendation for Phase 2 spike (pending owner approval)

**Primary spike order:**

1. **Cloudflare Realtime SFU** — maximize free GB, align with bandwidth economics for broadcast-style viewing.  
2. **LiveKit self-host or Cloud Build** — if Cloudflare API fit is poor, or for full OSS control.  
3. Daily/Agora only for short spikes with **billing disabled / hard spend caps**.

Implement behind existing `LiveMediaAdapter`. Do not set `isConfigured()` true until:

- Secrets live only in server env
- Token issuance is short-lived and role-scoped
- A host publishes and a **separate** viewer receives real media
- Contract tests cover failure when adapter is off

## Explicit non-actions

- Do not create paid subscriptions without written approval
- Do not put API keys in the repository
- Do not mark sessions LIVE until end-to-end media is verified

## Next concrete work (after approval of a candidate)

1. Spike adapter methods: `createInteractiveRoom`, `issuePublisherToken`, `issueViewerToken`, `getHealth`
2. Minimal host + viewer pages against one provider
3. Measure join time, startup, and failure modes on constrained mobile networks
4. Document cost estimate for 10 concurrent viewers × 1 hour

## Supabase migration note

Connected projects observed:

| Project | Ref | Status |
|---------|-----|--------|
| Fresh Web Lite | `fwbbyowalnfckpmbutcz` | ACTIVE — treat as **production**; do not apply Phase 1 migration without explicit approval |
| supabase-claret-blanket | `zzjlcbmzflqtqllsexxn` | INACTIVE — not suitable until restored |

Prefer a new disposable Supabase project or explicit owner approval before any DDL.
