# Fresh Web Lite — Runtime Infrastructure Status

## Verified
- Vercel production serves the Fresh Web Lite application.
- Supabase is an active healthy project with existing production tables.
- Browser media runtime supports local preview, playback persistence, WASM smoke execution, and WebM export.
- Fresh Flow runtime contracts, recommendation reranking, media orchestration, and security/auth contracts are present.
- An executable FFmpeg media-worker has been added at `workers/media-worker`.

## Media worker
The worker image installs FFmpeg and exposes:
- `GET /health`
- `POST /jobs`
- `GET /jobs/:id`
- `GET /jobs/:id/output`

A job downloads an HTTP(S) media input within bounded limits, performs a real FFmpeg transcode, records job state, and exposes the resulting media output while the worker instance retains it.

The browser adapter is `src/core/platform/remoteMediaWorker.ts` and activates only when `VITE_FRESH_MEDIA_WORKER_URL` is configured.

## Railway status
The existing Railway service is configured to build from `workers/media-worker` using its Dockerfile, start with `node server.mjs`, and health-check `/health`.

The service could not be redeployed in this pass because the Railway account/project trial has expired and Railway rejected the redeploy. No healthy worker deployment is claimed.

## Production boundary
Until Railway (or another real worker host) accepts a deployment and a live `/health` plus a real media job are verified, distributed media processing is **not** considered production-ready.

## Verification rule
A media feature is production only after an actual worker executes the operation, persists observable job state, and returns an observable output.
