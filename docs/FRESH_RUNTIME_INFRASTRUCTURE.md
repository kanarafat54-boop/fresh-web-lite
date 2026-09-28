# Fresh Web Lite Runtime Infrastructure Inventory

Checked: 2026-09-29

## Vercel
- Project: fresh-web-lite
- Framework: Vite
- Project ID: prj_SCEAVQBAhefd47ISn6YsHYfUcGkm
- Real production runtime is configured.
- Latest observed main deployment for commit 92894ec...: ERROR, lint_or_type_error.
- Previous known READY deployment: commit 991ca41...
- Vercel runtime-error clusters: none in the selected window.

## Supabase
- Project ref: fwbbyowalnfckpmbutcz
- Region: us-east-2
- PostgreSQL 17.6.1.141
- Status: ACTIVE_HEALTHY
- Live public tables include posts, shorts, creator_drafts, universal_interactions, Fresh Intelligence and Treasury tables.
- Edge Function noop-check is ACTIVE.
- Security advisors currently report RLS-enabled tables without policies, exposed SECURITY DEFINER functions, disabled leaked-password protection, and other performance findings.

## Railway
- Project: Fresh Web Lite
- Production environment exists.
- Service: fresh-web-lite
- Latest observed production deployment: FAILED on 2026-09-20.
- GitHub main is configured as source.
- One replica region is configured when deployed: us-east4-eqdc4a.
- No current healthy media-worker runtime was verified.

## Runtime boundary
Verified live infrastructure: Vercel platform, Supabase backend, Railway project/service (but failed).
Browser runtime: media preview, IndexedDB playback state, WASM smoke execution and WebM export.
Not deployed: distributed media workers, Kafka, Redis Pub/Sub, GPU inference, production HLS packager, WebRTC media backend, managed vector runtime.

Do not call the media platform fully distributed until a real worker accepts a media job, executes it, persists state and returns an observable output.
