// Project lifecycle against the real service, device backend and row mapping: origin and editor work survive every step.
import assert from "node:assert/strict";
const base = "../src/features/fresh-studio/";
const { createStudioProjectService } = await import(base + "projects/projectService.ts");
const { createDeviceBackend, MemoryStore } = await import(base + "projects/deviceBackend.ts");
const M = await import(base + "projects/projectMapping.ts");
const I = await import("../src/features/fresh-flow/core/freshFlowStudioIntegration.ts");
const W = await import(base + "writing-studio/writingDoc.ts");
const A = await import(base + "audio-studio/audioEdit.ts");
const P = await import(base + "shared/projectSettings.ts");

let n = 0;
const store = new MemoryStore();
const make = () => createStudioProjectService(createDeviceBackend(store, () => `id-${++n}`));
const svc = make();

// every one of the 24 systems creates a project that remembers where it came from, with default settings that validate
for (const p of I.FRESH_FLOW_STUDIO_PROFILES) {
  const created = await svc.create({ name: `From ${p.systemId}`, kind: p.mediaKind, sourceSystemId: p.systemId });
  assert.equal(created.meta.sourceSystemId, p.systemId, p.systemId);
  assert.equal(created.meta.kind, p.mediaKind);
  assert.ok(P.validateSettings(p.mediaKind, created.meta.settings).ok, `${p.systemId} default settings validate`);
}
assert.equal((await svc.list()).length, 24);

// a news post: write, save, reload through a brand-new service on the same storage
const news = (await svc.list()).find((x) => x.meta.sourceSystemId === "fresh-news");
const draft = { title: "Bridge reopens", body: "# Summary\nThe bridge reopened today after repairs. ".repeat(3), sources: "City | https://example.org/notice" };
const saved = await svc.updateSettings(news, W.toSettings(draft));
assert.equal(saved.version, news.version + 1);
const reloaded = await make().get(saved.id);
assert.deepEqual(W.readDraft(reloaded.meta.settings), draft, "draft survives reload");
assert.equal(reloaded.meta.sourceSystemId, "fresh-news", "origin survives reload");

// audio keeps its edit too
const pod = (await svc.list()).find((x) => x.meta.sourceSystemId === "fresh-podcasts");
const edit = { ...A.DEFAULT_EDIT, trimStartMs: 1000, markers: [{ ms: 5000, name: "Intro" }] };
const podSaved = await svc.updateSettings(pod, A.toSettings(edit));
assert.deepEqual(A.readAudioEdit((await make().get(podSaved.id)).meta.settings), edit);

// duplicate, archive, trash, restore keep origin and work
const copy = await svc.duplicate(saved);
assert.equal(copy.meta.sourceSystemId, "fresh-news");
assert.deepEqual(W.readDraft(copy.meta.settings), draft, "a copy carries the draft");
assert.notEqual(copy.id, saved.id);
const archived = await svc.archive(saved);
assert.equal(archived.meta.status, "archived");
const back = await svc.restore(archived);
assert.equal(back.meta.sourceSystemId, "fresh-news");
assert.notEqual(back.meta.status, "archived");
const trashed = await svc.moveToTrash(back);
const restored = await svc.restore(trashed);
assert.deepEqual(W.readDraft(restored.meta.settings), draft, "draft survives trash and restore");

// stale save is refused, not merged over newer work
const stale = saved; // version already behind
await assert.rejects(() => svc.updateSettings(stale, { draftTitle: "old" }), "stale version must be refused");

// checkpoint and restore a version brings the earlier draft back
const cp = await svc.checkpoint(restored, "before rewrite");
const rewritten = await svc.updateSettings(restored, { draftBody: "rewritten text" });
const rolled = await svc.restoreVersion(rewritten, cp);
assert.deepEqual(W.readDraft(rolled.meta.settings).body, draft.body);
assert.equal(rolled.meta.sourceSystemId, "fresh-news");

// row mapping (the Supabase path): origin round-trips, and rows written before origin existed load with null
const row = { id: "r1", workspace_id: "w", owner_id: "o", name: "n", version: 1, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z", status: "draft", metadata: M.metaToMetadata({ other: 1 }, rolled.meta) };
const viaRow = M.rowToProject(row);
assert.equal(viaRow.meta.sourceSystemId, "fresh-news");
assert.equal(viaRow.meta.kind, "custom");
assert.equal(row.metadata.other, 1, "other feature keys are kept");
const oldStudio = M.rowToProject({ ...row, metadata: { studio: { kind: "video", status: "planning", settings: { resolution: "720p" } }, category: "video" } });
assert.equal(oldStudio.meta.sourceSystemId, null, "old Studio project loads with no origin");
const legacy = M.rowToProject({ ...row, status: "in-production", metadata: { category: "audio" } });
assert.equal(legacy.meta.kind, "audio");
assert.equal(legacy.meta.sourceSystemId, null);
assert.equal(legacy.meta.status, "in_production");
assert.equal(M.rowToProject({ ...row, metadata: { category: "nonsense" } }), null, "unknown rows are skipped, not crashed on");
assert.equal(M.rowToProject({ ...row, metadata: null }), null);
console.log("Fresh Studio lifecycle contract passed (24 systems create, save, reload, copy, archive, trash, restore, version, old rows).");
