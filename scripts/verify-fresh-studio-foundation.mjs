import assert from "node:assert/strict";
import fs from "node:fs";

// Runs the real TypeScript sources via Node's built-in type stripping (no build step).
const base = "../src/features/fresh-studio/";
const { createStudioProjectService, StudioConflictError, StudioValidationError, isTrashed, isArchived, isActive } = await import(base + "projects/projectService.ts");
const { createDeviceBackend, MemoryStore } = await import(base + "projects/deviceBackend.ts");
const { rowToProject, metaToMetadata, parseStudioMeta, rowToVersion } = await import(base + "projects/projectMapping.ts");
const { settingFieldsFor, defaultSettingsFor, validateSettings } = await import(base + "shared/projectSettings.ts");
const { STUDIO_MEDIA_KINDS, STUDIO_STATUSES } = await import(base + "shared/types.ts");

function fresh() {
  let n = 0;
  let t = Date.parse("2026-11-02T08:00:00Z");
  const backend = createDeviceBackend(new MemoryStore(), () => `id-${++n}`, () => new Date((t += 1000)));
  return createStudioProjectService(backend, () => new Date((t += 1000)));
}
async function rejects(promise, ErrorType) {
  try { await promise; } catch (error) { assert.ok(error instanceof ErrorType, `expected ${ErrorType.name}, got ${error?.name}`); return error; }
  assert.fail(`expected ${ErrorType.name}`);
}

// --- Settings: only relevant fields per media type (spec §5.2)
assert.deepEqual(settingFieldsFor("custom"), []);
assert.ok(settingFieldsFor("video").some((f) => f.key === "frameRate"));
assert.ok(!settingFieldsFor("image").some((f) => f.key === "frameRate"), "images must not show frame rate");
assert.ok(!settingFieldsFor("video").some((f) => f.key === "canvasWidth"));
assert.ok(settingFieldsFor("audio").some((f) => f.key === "sampleRate"));
for (const kind of STUDIO_MEDIA_KINDS) {
  const v = validateSettings(kind, defaultSettingsFor(kind));
  assert.ok(v.ok, `defaults for ${kind} must validate`);
}
assert.equal(validateSettings("video", { resolution: "4K" }).ok, false, "unsupported resolutions are rejected");
assert.equal(validateSettings("image", { canvasWidth: 999999 }).ok, false);
const dropped = validateSettings("audio", { sampleRate: "48000", frameRate: "60" });
assert.ok(dropped.ok && !("frameRate" in dropped.settings), "irrelevant keys are dropped");

// --- Creation + validation
let svc = fresh();
const video = await svc.create({ name: "  My   first  film ", kind: "video", settings: { resolution: "720p" } });
assert.equal(video.name, "My first film");
assert.equal(video.version, 1);
assert.equal(video.meta.status, "planning");
assert.equal(video.meta.workspace, "video");
assert.equal(video.meta.settings.resolution, "720p");
assert.equal(video.meta.settings.aspectRatio, "9:16");
await rejects(svc.create({ name: "   ", kind: "video" }), StudioValidationError);
await rejects(svc.create({ name: "x".repeat(121), kind: "video" }), StudioValidationError);
await rejects(svc.create({ name: "ok", kind: "hologram" }), StudioValidationError);
await rejects(svc.create({ name: "ok", kind: "video", settings: { resolution: "8K" } }), StudioValidationError);

// --- Optimistic concurrency: stale writers are rejected, never overwrite (spec §15.3)
const renamed = await svc.rename(video, "Final cut");
assert.equal(renamed.version, 2);
const conflict = await rejects(svc.rename(video, "Stale edit"), StudioConflictError);
assert.equal(conflict.current.name, "Final cut", "conflict carries the current stored project");
assert.equal((await svc.get(video.id)).name, "Final cut");

// --- Settings stay editable without destroying work (spec §5.3)
const withSettings = await svc.updateSettings(renamed, { frameRate: "60" });
assert.equal(withSettings.meta.settings.frameRate, "60");
assert.equal(withSettings.meta.settings.resolution, "720p", "other settings preserved");
await rejects(svc.updateSettings(withSettings, { resolution: "9000p" }), StudioValidationError);

// --- Lifecycle: status, archive, trash, restore, delete-forever safeguards
const editing = await svc.setStatus(withSettings, "editing");
assert.equal(editing.meta.status, "editing");
const archived = await svc.archive(editing);
assert.ok(isArchived(archived) && !isActive(archived));
const unarchived = await svc.restore(archived);
assert.equal(unarchived.meta.status, "editing", "restore returns to the previous status");
const trashed = await svc.moveToTrash(unarchived);
assert.ok(isTrashed(trashed) && !isActive(trashed));
assert.ok(trashed.meta.deletedAt);
await rejects(svc.setStatus(trashed, "published"), StudioValidationError);
await rejects(svc.deleteForever(unarchived), StudioValidationError); // stale/not-trashed object
const live = await svc.get(video.id);
await rejects(svc.deleteForever({ ...live, meta: { ...live.meta, deletedAt: null } }), StudioValidationError);
const restored = await svc.restore(trashed);
assert.equal(restored.meta.deletedAt, null);
assert.equal(restored.meta.status, "editing");
const trashedAgain = await svc.moveToTrash(restored);
await svc.deleteForever(trashedAgain);
assert.equal(await svc.get(video.id), null);

// --- Duplicate resets lifecycle state and never copies the trash flag
const original = await svc.create({ name: "Poster", kind: "design" });
const published = await svc.setStatus(original, "published");
const copy = await svc.duplicate(published);
assert.notEqual(copy.id, published.id);
assert.equal(copy.name, "Poster (copy)");
assert.equal(copy.meta.status, "planning");
assert.equal(copy.meta.deletedAt, null);
assert.equal(copy.meta.kind, "design");

// --- Versions: checkpoints, autosave pruning, restore (spec §16.1)
svc = fresh();
let p = await svc.create({ name: "Song v1", kind: "audio" });
await svc.checkpoint(p, "First draft");
p = await svc.rename(p, "Song v2");
await svc.checkpoint(p);
const versions = await svc.listVersions(p.id);
assert.equal(versions.length, 2);
assert.deepEqual(versions.map((v) => v.kind).sort(), ["autosave", "checkpoint"]);
const cp = versions.find((v) => v.kind === "checkpoint");
assert.equal(cp.snapshot.name, "Song v1");
const back = await svc.restoreVersion(p, cp);
assert.equal(back.name, "Song v1");
await rejects(svc.rename(p, "stale after restore"), StudioConflictError);
p = back;
const afterRestore = await svc.listVersions(p.id);
assert.ok(afterRestore.some((v) => v.kind === "restore" && v.snapshot.name === "Song v2"), "current state is preserved before restoring");
const other = await svc.create({ name: "Other", kind: "audio" });
await rejects(svc.restoreVersion(other, cp), StudioValidationError);
for (let i = 0; i < 60; i += 1) { p = await svc.rename(p, `Take ${i}`); await svc.checkpoint(p); }
const pruned = await svc.listVersions(p.id);
assert.equal(pruned.filter((v) => v.kind === "autosave").length, 50, "autosaves are capped");
assert.equal(pruned.filter((v) => v.kind === "checkpoint").length, 1, "named checkpoints are never pruned");

// --- Device backend survives a reload (same store, new service) and tolerates corrupt storage
{
  const store = new MemoryStore();
  const a = createStudioProjectService(createDeviceBackend(store));
  const made = await a.create({ name: "Persisted", kind: "podcast" });
  const b = createStudioProjectService(createDeviceBackend(store));
  assert.equal((await b.get(made.id)).name, "Persisted");
  store.setItem("fresh.studio.projects.v1", "{not json");
  assert.deepEqual(await createStudioProjectService(createDeviceBackend(store)).list(), []);
}

// --- Row mapping: non-Studio fresh_projects rows are ignored; foreign metadata is preserved
const row = { id: "r1", workspace_id: "w1", owner_id: "u1", name: "N", status: "planning", version: 3, metadata: { other: { keep: true } }, created_at: "2026-11-02T00:00:00Z", updated_at: "2026-11-02T00:00:00Z" };
assert.equal(rowToProject(row), null);
const meta = parseStudioMeta({ studio: { kind: "image", status: "editing", settings: { canvasWidth: 800, evil: { nested: 1 } } } });
assert.equal(meta.kind, "image");
assert.equal(meta.workspace, "image");
assert.equal(meta.settings.canvasWidth, 800);
assert.ok(!("evil" in meta.settings), "non-primitive settings are dropped");
assert.equal(parseStudioMeta({ studio: { kind: "nope", status: "editing" } }), null);
assert.equal(parseStudioMeta({ studio: { kind: "image", status: "bogus" } }), null);
const merged = metaToMetadata(row.metadata, meta);
assert.deepEqual(merged.other, { keep: true });
assert.equal(merged.studio.kind, "image");
assert.equal(rowToProject({ ...row, metadata: merged }).version, 3);
assert.equal(rowToVersion({ id: "v", project_id: "p", version: 1, label: null, kind: "autosave", snapshot: "bad", created_at: "x" }), null);

// --- Status model matches spec §3.2
assert.deepEqual([...STUDIO_STATUSES], ["planning", "in_production", "editing", "review", "approved", "rendering", "ready_to_publish", "published", "failed", "archived"]);

// --- Migration safety: RLS on, no UPDATE policy, anon revoked
const sql = fs.readFileSync(new URL("../supabase/migrations/20261102100000_studio_project_versions.sql", import.meta.url), "utf8");
assert.match(sql, /enable row level security/i);
assert.doesNotMatch(sql, /for update/i, "versions are immutable");
assert.match(sql, /revoke all on public\.studio_project_versions from anon/i);
assert.match(sql, /p\.owner_id = \(select auth\.uid\(\)\)/, "insert policy must check project ownership");

// --- Browser code must not hold privileged credentials (spec §22)
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`]);
}
for (const file of walk(new URL("../src/features/fresh-studio", import.meta.url).pathname).filter((f) => /\.(ts|tsx)$/.test(f))) {
  assert.doesNotMatch(fs.readFileSync(file, "utf8"), /service_role|SERVICE_ROLE|BLENDER_RENDER_WORKER_TOKEN/, `${file} must not reference server-only credentials`);
}

console.log("Fresh Studio foundation contract passed.");

// --- Navigation, honesty registry, and integration with the existing Studio (spec §4, §26, §28)
{
  const { STUDIO_SECTIONS, MOBILE_PRIMARY_SECTIONS } = await import(base + "shared/studioNav.ts");
  const { STUDIO_CAPABILITIES, CAPABILITY_STATUSES } = await import(base + "shared/studioCapabilities.ts");
  assert.deepEqual(STUDIO_SECTIONS.map((s) => s.label), ["Home", "Projects", "Create", "AI Creation", "Assets", "Templates", "Brand Kit", "Publishing", "Analytics", "Team", "Settings"]);
  assert.ok(MOBILE_PRIMARY_SECTIONS.length <= 4, "mobile bottom bar must not be crowded");
  for (const c of STUDIO_CAPABILITIES) {
    assert.ok(CAPABILITY_STATUSES.includes(c.status));
    assert.notEqual(c.status, "production_verified", `${c.id} has no production evidence`);
    if (c.status === "backend_connected") assert.fail(`${c.id}: nothing is backend-connected until the migration is applied and verified`);
  }
  const ids = new Set(STUDIO_CAPABILITIES.map((c) => c.id));
  assert.equal(ids.size, STUDIO_CAPABILITIES.length, "capability ids are unique");
  const infoUses = fs.readFileSync(new URL("../src/features/fresh-studio/FreshStudioApp.tsx", import.meta.url), "utf8").match(/capabilityIds=\{\[([^\]]*)\]\}/g) ?? [];
  for (const use of infoUses) for (const id of use.match(/"([^"]+)"/g).map((x) => x.slice(1, -1))) assert.ok(ids.has(id), `unknown capability id ${id}`);

  const workspace = fs.readFileSync(new URL("../src/features/workspaces/StudioWorkspace.tsx", import.meta.url), "utf8");
  assert.match(workspace, /lazy\(\(\) => import\("\.\.\/fresh-studio\/FreshStudioApp"\)\)/, "Studio dashboard must be lazy-loaded");
  assert.match(workspace, /mode === "studio"/);
  for (const keep of ['mode === "production"', 'mode === "photo"', "FreshStudioProductionDesk"]) assert.ok(workspace.includes(keep), `existing Studio feature missing: ${keep}`);

  const shortsFiles = ["src/features/fresh-flow/components/ShortsStudio.tsx", "src/features/fresh-flow/core/shortsStudio.ts"];
  for (const f of shortsFiles) assert.doesNotMatch(fs.readFileSync(new URL(`../${f}`, import.meta.url), "utf8"), /fresh-studio/, "Shorts must not depend on the new Studio");

  const nav = fs.readFileSync(new URL("../src/app/navigation/navModel.ts", import.meta.url), "utf8");
  assert.doesNotMatch(nav, /fresh-studio/, "Fresh Flow navigation stays untouched");
}

console.log("Fresh Studio integration contract passed.");
