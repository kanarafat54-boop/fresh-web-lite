import assert from "node:assert/strict";
const H = await import("../src/features/creator/core/studioHandoff.ts");
const I = await import("../src/features/creator/core/createIntent.ts");

assert.equal(H.takeStudioExport(), null, "nothing waiting at first");
const file = new File([new Uint8Array(10)], "fresh-studio-export.mp4", { type: "video/mp4" });
H.stageStudioExport(file);
assert.equal(H.takeStudioExport(), file, "the staged export is handed over");
assert.equal(H.takeStudioExport(), null, "and only once");
// staging again replaces what was waiting
const a = new File([new Uint8Array(1)], "a.mp4"), b = new File([new Uint8Array(2)], "b.mp4");
H.stageStudioExport(a); H.stageStudioExport(b);
assert.equal(H.takeStudioExport(), b);
// the creator screen treats this as a Short, and does not confuse it with long videos
assert.equal(I.isShortCreateAction(H.STUDIO_HANDOFF_ACTION), true);
assert.equal(I.isShortCreateAction("long-video"), false);
console.log("studio to shorts handoff ok");
