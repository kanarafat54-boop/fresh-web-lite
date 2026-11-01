# Fresh Studio — Fantasy & Cinematic Production Architecture

Status: **architecture baseline / implementation not yet verified**  
Branch: `feat/fresh-studio-fantasy-cinema`  
Scope: Fresh Flow + Fresh Studio. Existing Fresh Shorts and established Fresh Flow navigation are protected.

## Product decision

Fresh Studio becomes one unified creator production environment with a hybrid editing experience and Fresh-native project/distribution workflows. Fantasy filmmaking is a first-class production workflow inside the same studio, not a separate app or a replacement for Shorts.

The Studio must support a progression from a simple phone-friendly creator workflow to a professional multi-track cinema workspace. Advanced controls are progressively disclosed; the default surface stays understandable on small Android screens.

## Capability map

| Fresh Studio system | Production responsibility | Professional reference workflow |
|---|---|---|
| Fresh Story & Director | screenplay, script breakdown, scene objectives, shot list, continuity and production plan | film directing / pre-production |
| Fresh World Builder | locations, landscapes, castles, sets, props and environment assembly | Blender / Unreal Engine workflows |
| Fresh Character & Creature Lab | character/creature assets, rigs, materials, expressions and animation-ready exports | Maya / Blender workflows |
| Fresh Animation | keyframes, timeline, rig controls, camera blocking and motion-capture import | Maya / Blender workflows |
| Fresh VFX Lab | particles, procedural effects, fire, smoke, lightning, water, destruction, portals and compositing layers | Houdini / Nuke / After Effects workflows |
| Fresh Cinema | shot sequencing, camera/lens controls, lighting, color pipeline, scene assembly and render queue | Unreal Engine / professional cinema workflows |
| Fresh Sound | dialogue, voice tracks, ambience, Foley, music and synchronized mixing | film sound post-production |
| Fresh Edit & Finish | multi-track edit, titles, transitions, color, captions, audio mix and final mastering | non-linear editing / finishing |
| Fresh Distribution | export profiles, rights/consent checks, metadata, thumbnails and publish handoff to Fresh Flow | Fresh-native distribution |

These are product capabilities and interoperability targets, not claims that Fresh currently contains Maya, Houdini, Nuke, Unreal Engine, or their proprietary engines.

## Screen architecture

1. **Studio Home** — New project, continue project, templates, recent work, asset library and render status.
2. **Project Setup** — title, format, frame rate, resolution, aspect ratio, language, target runtime and project privacy.
3. **Director Desk** — script editor, story outline, scene list, character list, locations, shot list and continuity notes.
4. **World Builder** — scene/location canvas, environment assets, terrain/set layers, lighting preview and asset provenance.
5. **Character & Creature Lab** — character sheets, model/rig slots, expressions, wardrobe, creature anatomy and animation readiness.
6. **Scene Stage** — viewport, scene hierarchy, transform tools, camera blocking, lighting and preview quality controls.
7. **Animation Timeline** — tracks for character, camera, object, facial and motion-capture animation; keyframe editing and playback.
8. **VFX Graph** — effect stack/graph with parameters, simulation preview, cache status and compositing order. Initial effect families: glow/energy, particles, fire, smoke, lightning, water, portals and destruction.
9. **Cinema Sequencer** — shots, takes, scene order, transitions, camera cuts, audio sync and rough-cut playback.
10. **Sound Stage** — dialogue, voiceover, Foley, ambience, music and mix buses with waveform/timing controls.
11. **Edit & Finish** — multi-track timeline, trims, captions, titles, color correction, transitions, audio mix and export validation.
12. **Render Queue** — queued jobs, progress, resource estimate, cancel/retry, logs, output validation and downloadable deliverables.
13. **Publish to Fresh Flow** — choose destination (Long Video, Movies & Series where eligible, Fresh Posts, or Shorts as a separate derived cut), audience, rights, caption, thumbnail and publish state.
14. **Creator Dashboard** — project storage, render history, asset usage, publish analytics and collaborator permissions.

## Fantasy production templates

Templates are starting points, not hard-coded effects:

- Wizard spell / energy projection
- Lightning and storm summoning
- Frozen rain / suspended water
- Portal opening and teleportation
- Dragon / mythical creature reveal
- Fantasy kingdom establishing shot
- Magical duel / battle sequence
- Transformation and creature morph
- Enchanted forest / floating city
- Cinematic trailer

Each template expands into editable shots, asset requirements, effect layers, sound cues and render settings. No template may claim a finished result until a real render artifact has been produced and validated.

## Core data model

Use versioned, project-scoped records. Do not overload the existing social `posts` table as the production database.

- `studio_projects`: owner, workspace, title, project type, format, status, visibility, version and timestamps.
- `studio_scenes`: project, scene number, slug, location, script excerpt, continuity state and duration.
- `studio_shots`: scene, shot number, camera setup, take, duration, status and sequence order.
- `studio_assets`: project, asset type, storage key, MIME type, size, checksum, provenance, license/consent metadata and validation status.
- `studio_tracks`: project/sequence, track type, ordering, mute/visibility and mix settings.
- `studio_clips`: track, asset, in/out points, timeline position, transform and effect references.
- `studio_effects`: clip/shot, effect type, versioned parameters, cache state and execution backend.
- `studio_render_jobs`: project/version, preset, queue state, progress, worker ID, logs, output key, checksum and validation result.
- `studio_collaborators`: project, user, role and invitation state.
- `studio_publish_jobs`: render artifact, target product, metadata, rights checks and publication state.

All user-owned records require authenticated owner/workspace authorization and RLS. Storage paths must be owner/project scoped. Service-role credentials must never reach the browser. Every mutation and render action must be validated server-side.

## Execution architecture

`Studio UI → Studio application service → authorization + project manifest → job queue → media/3D worker adapter → artifact validation → private storage → publish adapter`

- Keep browser UI separate from expensive rendering and simulation.
- Use asynchronous jobs for render, simulation, transcode and asset processing; support retry, cancellation, idempotency and job leases.
- Workers report structured progress and logs. A job is successful only after the expected output exists, has a non-zero size, passes media probing and matches its recorded checksum.
- Store source assets and generated outputs separately. Preserve immutable source versions and project revision history.
- Use capability adapters so the UI can report whether a backend is installed, configured, healthy, unsupported or unavailable.
- Initial practical media-worker integration may use the existing Fresh media worker for supported FFmpeg operations. FFmpeg is not a 3D renderer and must not be represented as one.
- Blender interoperability should begin with explicit import/export of supported formats (for example glTF/GLB and image/video/audio formats). Running Blender headlessly requires a separately provisioned worker with Blender installed; do not assume the existing web worker has it.
- Maya, Houdini, Nuke and Unreal Engine are optional external professional tools through documented interchange formats, not bundled software or silently invoked paid services.
- Keep all backend endpoints behind authenticated server routes. Never accept arbitrary executable code, shell commands or unrestricted remote URLs from project input.

## Backend capability truth states

Every capability exposed in Studio must have one of these states:

- `available`: a configured backend passed a health check and a real end-to-end test.
- `limited`: a real backend exists but has documented format, size, duration or quality limits.
- `setup-required`: implementation exists but required worker/configuration is absent.
- `planned`: design only; no working execution path.
- `failed`: last execution or health check failed, with a useful retry/support message.

Do not render decorative progress bars or sample outputs as live job status. Do not advertise AI-generated video, 3D generation, simulation or rendering until the corresponding backend has completed a real test and produced a validated artifact.

## Mobile-first and accessibility requirements

- Keep a simple guided mode usable on small Android devices and low-memory phones.
- Offer lightweight proxy previews; full-resolution render is an explicit background job.
- Autosave project edits with visible save state and conflict handling.
- Use large touch targets, readable labels, non-clipped dialogs and keyboard-accessible controls.
- Keep advanced graphs, node editors and dense timelines behind an explicit Advanced workspace mode.
- Support resumable uploads and interrupted-job recovery.
- Never require the user to keep the browser tab open for a queued render.

## Integration boundaries and non-regression rules

- Do not replace, rename, re-route or redesign Fresh Shorts.
- Do not change the established Fresh Flow top navigation or conditional bottom navigation.
- Long Video remains its own cinema-player product experience.
- Studio publishing to Shorts creates a derived cut and hands off to the existing Shorts publishing flow; it must not alter Shorts playback or feed behavior.
- Preserve current Fresh Flow system registry identifiers and route contracts.
- Keep project creation and editing separate from publishing. Drafts remain private until the user explicitly publishes.
- Do not create a new paid infrastructure dependency without an approved free-tier or self-hosted path.

## Delivery sequence and acceptance gates

### Phase 1 — Foundation
Project manifest/types, project CRUD, private asset storage, RLS, autosave, mobile Studio shell, capability registry and contract tests.

Acceptance: an authenticated owner can create, reopen, edit and delete a private project; another user cannot read or mutate it; no existing Fresh Flow/Shorts route changes.

### Phase 2 — Editing and media pipeline
Timeline model, proxy preview, supported FFmpeg jobs, resumable asset upload, render queue, job status and output validation.

Acceptance: a real uploaded source can be trimmed/assembled, rendered by the configured worker, probed, checksum-recorded and downloaded; failures are visible and retryable.

### Phase 3 — Director and cinema workflow
Screenplay/scene/shot records, storyboard references, shot sequencing, camera metadata, audio tracks and long-form export.

Acceptance: a creator can organize a multi-scene film and produce a valid long-form video using only implemented capabilities.

### Phase 4 — 3D and fantasy VFX
Blender worker proof-of-capability, glTF/GLB asset pipeline, scene import/export, first real effect simulations and compositing.

Acceptance: a Blender worker renders a test scene and returns a validated artifact; at least one effect family is rendered from editable parameters. If Blender is not provisioned, show `setup-required`, not a fake result.

### Phase 5 — Advanced production and Fresh AI assistance
Optional external-tool interchange, motion-capture ingestion, advanced VFX, AI-assisted script/shot planning and creator controls. AI suggestions must remain editable and must not be presented as rendered media.

Acceptance: each advertised capability has a backend contract, authorization tests, failure tests and a real artifact-based end-to-end test.

### Phase 6 — Fresh Flow distribution
Publish validated deliverables to existing Fresh Flow destinations through their established publishing contracts.

Acceptance: user confirmation, ownership/rights checks, metadata validation and successful publication; Shorts is only touched through its existing supported handoff.

## Required verification

Run the existing project checks before and after implementation:

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run test:fresh-flow-fabric`
- `npm run test:fresh-flow-capability-registry`
- `npm run test:fresh-flow-system-registry`
- `npm run test:fresh-media-worker-contract`
- `npm run test:fresh-media-runtime`
- `npm run test:fresh-media-publishing`
- `npm run test:shorts`
- `npm run test:fresh-flow-navigation-browser`

Add Studio-specific tests for project ownership/RLS, asset upload, render queue idempotency, worker health, output probing/checksum, retry/cancel, capability state truthfulness, mobile layout and publish handoff. Run browser tests against built output. Do not merge or claim completion while required checks fail or have not been run.

## Current implementation truth

This document records the approved architecture direction only. The repository already contains Fresh Flow system/architecture registries, a long-video experience, a creator dashboard and a media worker contract. This document does **not** prove that a 3D worker, Blender runtime, fantasy VFX engine, cinema sequencer or complete Fresh Studio pipeline exists. Implementation must inspect and extend existing contracts rather than duplicate them.
