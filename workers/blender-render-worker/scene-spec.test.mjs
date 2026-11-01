import test from "node:test";
import assert from "node:assert/strict";
import { validateSceneSpec } from "./scene-spec.mjs";

test("accepts a bounded scene and normalizes render dimensions", () => {
  const result = validateSceneSpec({ title: "Enchanted gate", width: 1920, height: 1080, objects: [{ type: "torus", color: "#aa22ff" }] });
  assert.equal(result.ok, true);
  assert.equal(result.scene.width, 1280);
  assert.equal(result.scene.height, 720);
  assert.equal(result.scene.objects[0].color, "#aa22ff");
});

test("rejects external file and arbitrary object types", () => {
  const result = validateSceneSpec({ objects: [{ type: "script", path: "/etc/passwd" }] });
  assert.equal(result.ok, false);
});

test("rejects excessive object counts", () => {
  const result = validateSceneSpec({ objects: Array.from({ length: 17 }, () => ({ type: "cube" })) });
  assert.equal(result.ok, false);
});

test("rejects invalid coordinates and scale", () => {
  const result = validateSceneSpec({ objects: [{ type: "cube", position: { x: 100 }, scale: { x: 0 } }] });
  assert.equal(result.ok, false);
});
