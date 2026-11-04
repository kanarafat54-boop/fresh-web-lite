# Fresh Blender Render Worker

A separate, authenticated CPU rendering service for Fresh Studio. It uses Blender in background mode to create a bounded 3D scene and return a validated PNG artifact.

## Current scope

- Primitive geometry: cube, UV sphere, cone, torus and plane.
- Per-object position, scale, rotation and material color.
- Generated camera, area lighting and Eevee render.
- 320–1280 by 240–720 output, at most 16 objects.
- One active render job per worker instance; bounded retained job records.
- Authenticated job submission, status and output retrieval.
- No arbitrary script upload, external asset URL, filesystem path or user-supplied Blender Python is accepted.

This is the first renderer adapter, not a complete modeling, rigging, animation, simulation or VFX-compositing system.

## Run locally

Requires Node.js 22+ and Blender installed on PATH.

```sh
npm test
FRESH_BLENDER_WORKER_API_TOKEN='use-a-long-random-secret' npm start
```

Health check: `GET /health`. Authenticated render API: `POST /jobs`, `GET /jobs/:id`, `GET /jobs/:id/output`.

## Container deployment

Build the image with this directory as the Docker build context:

```sh
docker build -t fresh-blender-render-worker .
docker run --rm -p 8081:8081 -e FRESH_BLENDER_WORKER_API_TOKEN='use-a-long-random-secret' fresh-blender-render-worker
```

For a hosted Docker service, set its root/build directory to `workers/blender-render-worker`, use the included Dockerfile, and configure `FRESH_BLENDER_WORKER_API_TOKEN`.

In Vercel, configure the same secret as `FRESH_BLENDER_WORKER_API_TOKEN` and set `FRESH_BLENDER_WORKER_URL` to the deployed worker's HTTPS origin. These are server-only variables; never prefix them with `VITE_`.

The application proxy validates the user's Supabase access token before forwarding a request and injects the worker secret server-side. The worker itself must not be exposed as an unauthenticated public render API.

## Operational limits

The in-memory queue and artifacts are ephemeral and reset when the worker restarts. This initial worker is suitable for preview jobs only. Durable queueing, object storage, distributed job leases, GPU rendering and project-scoped authorization/persistence are subsequent production hardening work.
