import assert from "node:assert/strict";
const T = await import("../src/features/fresh-studio/video-studio/timeline.ts");
const E = await import("../src/features/fresh-studio/video-studio/exportJob.ts");

const asset = { id: "a", name: "a.mp4", kind: "video", duration: 10, width: 640, height: 360, hasAudio: true };
const doc = T.addClip(T.addAsset(T.createTimeline(30), asset), { trackId: "v1", assetId: "a", id: "c1" });
const caps = { text: true, presets: ["360p", "720p"], aspectRatios: ["16:9", "9:16"], frameRates: [30], maxSeconds: 60, maxSources: 4, maxInputBytes: 1000 * 1000 };
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
// the worker nests its limits under `render`; the parser must unwrap them and reject anything else
{
  const wire = { ok: true, ffmpeg: true, render: { presets: ["360p", "720p"], aspectRatios: ["16:9"], frameRates: [30], maxSeconds: 120, maxSources: 8, maxInputBytes: 1000, text: true, maxCaptionBytes: 5 } };
  const c = E.parseCapabilities(wire);
  assert.deepEqual(c.presets, ["360p", "720p"]); assert.equal(c.text, true); assert.equal(c.maxSeconds, 120);
  assert.equal(E.parseCapabilities({ render: { ...wire.render, text: undefined } }).text, false);
  for (const bad of [null, {}, { ok: true }, { render: { presets: "720p" } }, { render: { ...wire.render, maxSeconds: "x" } }, wire.render]) assert.throws(() => E.parseCapabilities(bad), /not with what this version/);
}
// text needs a worker that has fonts
{
  const withText = T.addText(doc, { start: 0, id: "t1", text: "Hi" });
  assert.equal(E.checkExport(input({ doc: withText }), caps), null);
  assert.match(E.checkExport(input({ doc: withText }), { ...caps, text: false }), /cannot export text/);
}
console.log("fresh-studio export orchestration: ok");

// retry on a dropped connection reuses one key; a real answer from the service is final
{ const keys = []; let n = 0;
  const { ports } = fakePorts({ submit: async (_b, k) => { keys.push(k); if (n++ === 0) throw new Error("network down"); return { jobId: "j1" }; } });
  await E.runExport(ports, input()); assert.equal(keys.length, 2); assert.equal(keys[0], keys[1]); assert.ok(keys[0].length >= 8); }
{ let n = 0; const { ports } = fakePorts({ submit: async () => { n += 1; throw new E.ExportError("You already have a render in progress."); } });
  await assert.rejects(E.runExport(ports, input()), /already have a render/); assert.equal(n, 1); }
{ let n = 0; const { ports } = fakePorts({ submit: async () => { n += 1; throw new Error("network down"); } });
  await assert.rejects(E.runExport(ports, input()), /network down/); assert.equal(n, 2); }
// output verification: matching bytes pass, a bad first download is fetched once more, two bad ones fail
{ const bytes = new Uint8Array(5000).fill(7); const sha = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (b) => b.toString(16).padStart(2, "0")).join("");
  const facts = { bytes: 5000, sha256: sha, duration: 1, width: 640, height: 360 };
  const run = (downloads) => { let i = 0; const seen = []; const { ports } = fakePorts({ status: async () => ({ status: "succeeded", output: facts }), download: async () => downloads[Math.min(i++, downloads.length - 1)] });
    return E.runExport(ports, input(), { onOutput: (f) => seen.push(f) }).then(() => seen); };
  const good = new Blob([bytes]), bad = new Blob([new Uint8Array(5000).fill(1)]);
  assert.equal((await run([good]))[0].verified, true);
  assert.equal((await run([bad, good]))[0].verified, true);
  await assert.rejects(run([bad, bad]), /does not match/); }
