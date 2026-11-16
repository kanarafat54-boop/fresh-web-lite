import assert from "node:assert/strict";
import { readAdjust, cssFilter, rotate, outputSize, isDefault, exportFileName, DEFAULT_ADJUST } from "../src/features/fresh-studio/image-studio/imageAdjust.ts";
import { validateSettings, defaultSettingsFor } from "../src/features/fresh-studio/shared/projectSettings.ts";
import { hasStudioEditor } from "../src/features/fresh-studio/shared/studioNav.ts";

// Older image projects have no adjustments: defaults.
assert.deepEqual(readAdjust({ canvasWidth: 1080 }), DEFAULT_ADJUST);
assert.deepEqual(readAdjust({ brightness: 999, contrast: -5, saturation: "x", rotation: 450 }), { brightness: 150, contrast: 50, saturation: 100, rotation: 90 });
assert.equal(readAdjust({ rotation: -90 }).rotation, 270);
assert.equal(readAdjust({ rotation: 44 }).rotation, 0);
assert.equal(cssFilter({ brightness: 110, contrast: 90, saturation: 0, rotation: 0 }), "brightness(110%) contrast(90%) saturate(0%)");
let a = DEFAULT_ADJUST;
a = rotate(a, "right"); assert.equal(a.rotation, 90);
a = rotate(a, "left"); a = rotate(a, "left"); assert.equal(a.rotation, 270);
assert.deepEqual(outputSize(400, 300, 90), { width: 300, height: 400 });
assert.deepEqual(outputSize(400, 300, 180), { width: 400, height: 300 });
assert.ok(isDefault(DEFAULT_ADJUST) && !isDefault({ ...DEFAULT_ADJUST, contrast: 99 }));
assert.equal(exportFileName("My Trip (1).jpg", "x"), "fresh-studio-My-Trip-1.png");
assert.equal(exportFileName("", ""), "fresh-studio-photo.png");

// Adjustments survive the project settings validation (this is what makes a saved edit come back).
const saved = validateSettings("image", { ...defaultSettingsFor("image"), brightness: 120, rotation: 270 });
assert.equal(saved.ok, true);
assert.equal(saved.settings.brightness, 120);
assert.deepEqual(readAdjust(saved.settings), { brightness: 120, contrast: 100, saturation: 100, rotation: 270 });
assert.equal(validateSettings("image", { brightness: 200 }).ok, false, "out of range is rejected, not stored");
// An old image project's settings (no adjustment keys) still validate.
assert.equal(validateSettings("image", { canvasWidth: 1080, canvasHeight: 1080, colorSpace: "sRGB", orientation: "square" }).ok, true);
assert.equal(hasStudioEditor("image") && hasStudioEditor("video") && !hasStudioEditor("audio"), true);
console.log("studio image ok");
