# Fresh Infinite Storage (FIS) — Phase 0 Audit and Foundation

**Repository:** `kanarafat54-boop/fresh-web-lite`  
**Audit base:** `main` at `9553f1e332d2602ac73efd41028880ed408221af`  
**Work branch:** `feat/fresh-infinite-storage-foundation`  
**Scope:** platform-wide cloud storage plus storage-efficiency/device-local optimization  
**First priority:** shared Fresh Web Lite platform  
**Safety:** additive foundation only; no production deployment, live bucket mutation, data migration, or replacement of existing upload paths.

## Executive finding

Fresh already uses multiple storage mechanisms, but no single provider-neutral storage control plane currently governs them. The repository contains Supabase Storage buckets, browser IndexedDB, media-worker temporary files, and multiple direct Supabase upload call sites. This creates separate limits, policies, lifecycle behavior and operational visibility.

The first verified blocker is a mismatch between the Long Video product contract and its storage configuration:

- `uploadLongVideoResumable.ts` permits files up to **5,000,000,000 bytes** and uses TUS with 6 MiB chunks.
- `20261030213000_fresh_long_video_storage_bucket_provision.sql` provisions `post-videos` with a **52,428,800-byte (50 MiB)** per-bucket limit.
- `20261030172329_fresh_long_video_library_foundation.sql` also sets that bucket to 50 MiB.
- The uploader's preflight correctly checks the server-advertised TUS maximum, so a file above the effective limit is rejected rather than silently accepted.
- Supabase's current file-limit documentation says the Free plan's global limit cannot exceed 50 MB; bucket limits cannot exceed the global limit. Therefore changing only the bucket migration cannot deliver 5 GB uploads on a Free Supabase project.

**Decision:** keep Supabase as an existing provider and metadata/auth system, but make large-object capacity provider-neutral. Do not claim 5 GB support until a provider whose configured global and object limits support the request is connected and verified.

## Existing storage inventory

| Area | Existing implementation | Verified limitation / risk |
|---|---|---|
| Long Videos / posts | Supabase `post-videos`, public URLs, TUS resumable upload | Code advertises 5 GB; migrations cap bucket at 50 MiB; Supabase Free global limit is 50 MB |
| Creator images | Supabase `post-images` direct upload | Direct upload call site; bucket policy/size behavior needs live inventory |
| Profile media | Public `profile-media` bucket | Public reads by design; owner-folder writes |
| Comment media | Public `comment-media` bucket | Public reads by design; owner-folder writes |
| Fresh AI media | Private `fresh-ai-media` bucket plus `fresh_ai_media_assets` metadata | Separate private bucket; no provider-neutral object adapter found in inspected paths |
| Fresh Studio | Private `studio-media` bucket; short-lived signed URLs for render worker | 500 MiB bucket cap; direct Supabase upload; project/source lifecycle needs reconciliation |
| Browser media cache | IndexedDB `fresh-web-lite-media` | Device/browser-local; quota is browser/device controlled, not cloud capacity or backup |
| Media worker | Render worker uses a local temporary root (default `/tmp/fresh-media-worker`) | Temporary processing storage is not durable object storage |
| Fingerprints | `short_media_fingerprints` records SHA-256, size and provenance | Fingerprints are identity/provenance metadata, not deduplication or object replication |

## Current upload and access patterns

1. Long Video: browser obtains the signed-in Supabase session, sends TUS requests to the Supabase Storage resumable endpoint, stores resumable session metadata in `sessionStorage`, and returns a public object URL.
2. Creator Studio: uploads source blobs to private `studio-media`, then obtains a one-hour signed URL for the render worker.
3. Creator posts: direct Supabase upload to `post-images` or `post-videos`.
4. Fresh AI: server-side services upload bytes into a selected Supabase bucket and persist object references in `fresh_ai_media_assets`.
5. Local editing: Studio media imports use IndexedDB so local source files need not be uploaded until export.

These paths must not be switched wholesale. They have different privacy, retention and delivery requirements.

## Foundation added in this branch

`src/core/storage/storageRouter.mjs` and its TypeScript declarations provide an additive, provider-neutral selection contract:

- providers advertise readiness, priority, per-object maximum, currently available capacity, public/private access modes and capabilities;
- routing checks requested size, capacity, access mode, resumable upload and range-read requirements;
- deterministic priority ordering;
- explicit `null` when no provider qualifies — never silently route to an undersized provider;
- duplicate provider IDs are rejected;
- no credentials, network calls, provider SDKs or production upload paths are touched.

The contract is intentionally not wired into existing product flows yet. The next stage is to implement and test adapters, then migrate one low-risk flow at a time.

## Target architecture

```text
Fresh Web Lite directorates
  Live | Shorts | Video | Studio | AI | Mail | Crypto | Profiles | Messages
                              |
                    Fresh Storage SDK / API
                              |
                 Storage Gateway + Policy Engine
                              |
                 Provider Registry / Router
                 /            |             \
        Supabase Storage   S3-compatible   Device Cache
        metadata/auth      object stores   IndexedDB
                 \            |             /
                   Lifecycle + Integrity
              checksums | retention | archive
                              |
                 Observability / Cost Controls
```

### Control-plane responsibilities

- canonical object identity and metadata;
- owner, tenant and directorate authorization;
- provider health and capability registry;
- per-tenant quotas and admission checks;
- upload session creation, resumability and completion verification;
- object integrity (SHA-256), lifecycle state and deletion tombstones;
- retention, legal hold and recovery policy;
- provider cost/egress telemetry and budget guardrails.

### Data-plane responsibilities

- upload/download bytes directly to the chosen provider using scoped signed URLs or short-lived credentials;
- support TUS or multipart uploads where available;
- support HTTP range reads for streaming;
- keep large media bytes out of Postgres;
- use CDN/cache for hot public content;
- keep private assets private and issue short-lived access URLs.

## Storage efficiency and device scope

- IndexedDB remains a cache/workspace layer, never the canonical backup.
- Add browser quota estimation, cache eviction and user-visible local-storage status.
- Add content-hash deduplication only after authorization and reference-count semantics are proven. Never deduplicate across tenants in a way that reveals object existence.
- Add media-aware compression/transcoding as derived assets; preserve originals where required.
- Lifecycle transitions: hot → warm → archive → deletion only under explicit retention policy.
- Replication and backup must be tested by restoring objects, not merely observing that copies exist.

## Security invariants

- Every object has an owner/tenant and directorate namespace.
- Private by default; public delivery is an explicit policy decision.
- Signed URLs are short-lived and scoped to one object and operation.
- Never expose Supabase service-role/secret keys or S3 credentials in browser bundles.
- Every provider adapter must enforce authorization before issuing upload/download capabilities.
- Verify size, MIME, checksum and completion before publishing metadata.
- Deletes must coordinate object removal, metadata tombstones, retries and orphan cleanup.
- No client-controlled metadata is trusted for authorization.

## Provider strategy

1. **Keep Supabase** for existing objects, authentication integration, metadata and flows already using its Storage API.
2. **Add an S3-compatible object-storage adapter** for large media and capacity expansion, selected only after provider pricing, egress, regional availability, object-size and free-tier terms are checked.
3. **Retain IndexedDB** for local drafts/cache with quota awareness.
4. **Do not use the render worker's temporary filesystem as durable storage.**
5. Support a second provider before claiming provider redundancy; a registry interface alone is not redundancy.

## Rollout plan

### Phase 0 — Audit (current)
- Inventory every bucket, migration, policy, upload path and local cache.
- Confirm live bucket settings, global limits, RLS/policies, provider plan, usage and backup configuration.
- Identify object references and orphan/deletion behavior.
- Record exact CI and integration tests.

### Phase 1 — Provider-neutral foundation (current branch)
- Add provider contract and deterministic router.
- Test capability, capacity, visibility and fallback decisions.
- Keep all existing flows unchanged.

### Phase 2 — First durable object adapter
- Select provider based on verified cost, free allowance, region and S3/TUS/multipart capabilities.
- Store credentials server-side only.
- Implement signed upload/download, range reads, checksum verification and resumable multipart/TUS.
- Add an isolated test bucket and synthetic test objects.

### Phase 3 — Metadata and lifecycle
- Introduce canonical object records and migration only after production schema and RLS review.
- Add quota accounting, deduplication references, cleanup queue and archive policy.
- Rehearse backup and restore.

### Phase 4 — Gradual integration
- Pilot with new Studio source assets or a dedicated test flow.
- Preserve existing URLs/records and implement compatibility reads.
- Migrate Long Video only after provider tests and backfill/rollback design.
- Integrate remaining directorates incrementally.

### Phase 5 — Operations
- Load, concurrency, interruption, retry, provider outage and restore tests.
- Monitor bytes stored, egress, cache hit ratio, upload failure, orphan count and cost per active user.
- Publish truthful capacity and retention limits.

## Verification record

The routing test is `node scripts/verify-fresh-infinite-storage-foundation.mjs`. It covers:
- small-object provider selection;
- large-object routing away from a 50 MiB provider;
- resumable capability requirements;
- unavailable/degraded providers;
- insufficient available capacity;
- invalid request sizes;
- duplicate provider registration.

Repository CI must also run the existing build, typecheck, lint and media contract suites before a pull request is considered ready.

## Not yet verified

This GitHub-only audit cannot read the connected Supabase project's live dashboard configuration or actual object inventory. It does not establish:
- the active Supabase plan/global file limit;
- live bucket limits and current RLS policies;
- actual bytes used, egress or quota remaining;
- whether a second object-storage provider is already configured outside the repository;
- backup/restore coverage or data residency;
- production TUS limits and real upload success above 50 MiB.

No production settings have been changed. No migration has been applied. No existing objects have been moved or deleted.
