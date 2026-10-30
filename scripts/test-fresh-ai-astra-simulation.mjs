import assert from "node:assert/strict";
import { runAstraGridSimulation, validateAstraGridWorld } from "../src/core/fresh-ai/astra/AstraSimulation.ts";

const world = {
  width: 5,
  height: 5,
  obstacles: [{ x: 1, y: 3 }, { x: 3, y: 1 }],
  robot: { x: 1, y: 1, heading: "north" },
};

assert.deepEqual(validateAstraGridWorld(world), [], "valid bounded world passes");
const collision = runAstraGridSimulation(world, ["move-forward", "move-forward", "move-forward"]);
assert.deepEqual(collision.world.robot, { x: 1, y: 2, heading: "north" }, "robot stops before obstacle");
assert.equal(collision.metrics.distanceTravelled, 1);
assert.equal(collision.metrics.collisions, 1);
assert.equal(collision.metrics.halted, true);
assert.ok(collision.metrics.stopReason?.includes("Collision"));

const turnAndMove = runAstraGridSimulation(world, ["turn-right", "move-forward", "turn-left", "move-forward"]);
assert.deepEqual(turnAndMove.world.robot, { x: 2, y: 2, heading: "north" });
assert.equal(turnAndMove.metrics.distanceTravelled, 2);
assert.equal(turnAndMove.metrics.collisions, 0);

const boundary = runAstraGridSimulation({ width: 2, height: 2, obstacles: [], robot: { x: 0, y: 1, heading: "north" } }, ["move-forward"]);
assert.equal(boundary.metrics.collisions, 1, "world boundary blocks movement");
assert.deepEqual(boundary.world.robot, { x: 0, y: 1, heading: "north" });

const stopped = runAstraGridSimulation(world, ["turn-right", "stop", "move-forward"]);
assert.deepEqual(stopped.world.robot, { x: 1, y: 1, heading: "east" });
assert.equal(stopped.metrics.stepsExecuted, 2, "commands after stop are not executed");
assert.equal(stopped.metrics.halted, true);

assert.deepEqual(runAstraGridSimulation(world, ["turn-right", "move-forward"]), runAstraGridSimulation(world, ["turn-right", "move-forward"]), "simulation is deterministic");
assert.deepEqual(world.robot, { x: 1, y: 1, heading: "north" }, "input world remains immutable");
assert.ok(validateAstraGridWorld({ ...world, obstacles: [{ x: 1, y: 1 }] }).some((x) => x.includes("start inside")));
assert.ok(validateAstraGridWorld({ ...world, obstacles: [{ x: 2, y: 2 }, { x: 2, y: 2 }] }).some((x) => x.includes("Duplicate")));
assert.throws(() => runAstraGridSimulation(world, Array(101).fill("move-forward"), { maxSteps: 100 }), /exceeds maxSteps/);
assert.throws(() => runAstraGridSimulation(world, ["launch-missile"]), /unsupported command/);
assert.throws(() => runAstraGridSimulation({ ...world, width: 101 }, []), /dimensions/);

console.log("Astra deterministic simulation passed: bounds, obstacles, collision stop, turns, stop command, determinism and invalid-input checks.");
