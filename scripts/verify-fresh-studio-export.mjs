import assert from "node:assert/strict";
const T = await import("../src/features/fresh-studio/video-studio/timeline.ts");
const E = await import("../src/features/fresh-studio/video-studio/exportJob.ts");

const asset = { id: "a", name: "a.mp4", kind: "video", duration: 10, width: 640, height: 360, hasAudio: true };
const doc = T.addClip(T.addAsset(T.createTimeline(30), asset), { trackId: "v1", assetId: "a", id: "c1" });
const caps = { presets: ["360p", "720p"], aspectRatios: ["16:9", "9:16"], frameRates: [30], maxSeconds: 60, maxSources: 4, maxInputBytes: 1000 * 1000 };
const big = new Blob([new Uint8Array(2000)]);
const input = (o = {}) => ({ doc, preset: "720p", aspectRatio: "16:9", captions: [], blobs: new Map([["a", new Blob([new Uint8Array(500)])]]), names: new Map([["a", "a.mp4"]]), ...o });

// local checks
assert.equal(E.checkExport(input(), caps), null);
assert.match(E.checkExport(input({ preset: "1080p" }), caps), /not available/);
assert.match(E.checkExport(input({ aspectRatio: "4:5" }), caps), /aspect/);
assert.match(E.checkExport(input({ blobs: new Map() }), caps), /not stored on this device/);
assert.match(E.checkExport(input({ blobs: new Map([["a", new Blob([new Uint8Array(2_000_000)])]]) }), caps), /accepts files up to/);
assert.match(E.checkExport(input(), { ...caps, maxSeconds: 5 }), /up to 5 seconds/);
assert.deepEqual(E.availableExportOptions(null).presets, []);

const fakePorts = (over = {}) => {
  const calls = [];
  const statuses = [{ status: "running", progress: 0.4 }, { status: "succeeded", progress: 1 }];
  return { calls, ports: {
    getCapabilities: async () => caps,
    uploadSource: async (id) => { calls.push(`upload:${id}`); return `https://x.test/${id}`; },
    submit: async (b) => { calls.push("submit"); assert.equal(b.sources.a, "https://x.test/a"); return { jobId: "j1" }; },
    status: async () => { calls.push("status"); return statuses.shift() ?? { status: "succeeded" }; },
    cancel: async () => { calls.push("cancel"); },
    download: async () => { calls.push("download"); return new Blob([new Uint8Array(5000)]); },
    sleep: async () => {}, ...over } };
};

// happy path
{ const { ports, calls } = fakePorts(); const stages = []; const prog = [];
  const out = await E.runExport(ports, input({ captions: [{ id: "1", start: 0, end: 1, text: "hi" }] }), { onStage: (s) => stages.push(s), onProgress: (p) => prog.push(p) });
  assert.equal(out.size, 5000); assert.deepEqual(stages, ["checking", "uploading", "rendering", "downloading"]);
  assert.deepEqual(calls.filter((c) => c !== "status"), ["upload:a", "submit", "download"]); assert.equal(prog.at(-1), 1); }
// validation failure uploads nothing
{ const { ports, calls } = fakePorts(); await assert.rejects(E.runExport(ports, input({ preset: "1080p" })), E.ExportError); assert.deepEqual(calls, []); }
// worker failure surfaces its message
{ const { ports } = fakePorts({ status: async () => ({ status: "failed", error: "ffmpeg exploded" }) }); await assert.rejects(E.runExport(ports, input()), /ffmpeg exploded/); }
// empty output rejected
{ const { ports } = fakePorts({ download: async () => new Blob([new Uint8Array(10)]) }); await assert.rejects(E.runExport(ports, input()), /empty/); }
// cancel mid-render tells the worker
{ const ctl = new AbortController(); const { ports, calls } = fakePorts({ status: async () => { ctl.abort(); return { status: "running" }; } });
  await assert.rejects(E.runExport(ports, input(), { signal: ctl.signal }), E.ExportCancelled); assert.ok(calls.includes("cancel")); }
// cancel before upload
{ const ctl = new AbortController(); ctl.abort(); const { ports, calls } = fakePorts(); await assert.rejects(E.runExport(ports, input(), { signal: ctl.signal }), E.ExportCancelled); assert.ok(!calls.includes("submit")); }
// timeout stops the job
{ const { ports, calls } = fakePorts({ status: async () => ({ status: "running" }) }); await assert.rejects(E.runExport(ports, input()), /too long/); assert.ok(calls.includes("cancel")); }
console.log("fresh-studio export orchestration: ok");
