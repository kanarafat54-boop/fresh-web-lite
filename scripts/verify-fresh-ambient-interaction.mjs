import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root = process.cwd();
const source = fs.readFileSync(
  path.join(root, "src/core/fresh-platform/AmbientInteractionEngine.ts"),
  "utf8",
);

assert.match(source, /enabled: boolean/, "interaction sensing must be opt-in");
assert.match(source, /document\.visibilityState === "hidden"/, "hidden pages must not emit signals");
assert.match(source, /event\.pointerType === "touch"/, "touch input must be distinguished");
assert.match(source, /event\.pointerType === "touch"\) return/, "touch devices must not synthesize hover");
assert.match(source, /removeEventListener\("pointerdown"/, "cleanup must remove listeners");
assert.match(source, /possible-control-confusion/, "repeated actions may surface a cautious assistance hint");
assert.match(source, /Raw pointer coordinates and typed text are never retained/, "privacy boundary must be documented");
assert.doesNotMatch(source, /getUserMedia|MediaRecorder|navigator\.geolocation|document\.body\.innerText/, "must not collect camera, microphone, location, or page text");

console.log("Ambient interaction privacy contract passed.");
