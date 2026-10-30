import assert from "node:assert/strict";
import { coordinateFreshAstra, assertFreshAstraIntegrity } from "../src/core/fresh-ai/FreshAstra.ts";

assertFreshAstraIntegrity();
const chat = coordinateFreshAstra("Hello, how are you?");
assert.equal(chat.executionAllowed, false);
assert.equal(chat.risk, "none");
assert.deepEqual(chat.modules.map((item) => item.id), ["language"]);

const video = coordinateFreshAstra("Create a long video with consistent scenes and audio");
assert.ok(video.modules.some((item) => item.id === "video"));
assert.ok(video.modules.some((item) => item.id === "vision"));
assert.ok(video.modules.some((item) => item.id === "audio"));
assert.equal(video.modules.find((item) => item.id === "video")?.readiness, "in-development");

const robot = coordinateFreshAstra("Move the robot arm and operate the machine");
assert.equal(robot.risk, "physical");
assert.equal(robot.approvalRequired, true);
assert.equal(robot.executionAllowed, false);
assert.ok(robot.limitations.some((item) => item.includes("Physical actuation is blocked")));
assert.equal(robot.modules.find((item) => item.id === "robotics")?.readiness, "contracted");

const highImpact = coordinateFreshAstra("Delete the production database");
assert.equal(highImpact.risk, "high");
assert.equal(highImpact.approvalRequired, true);
assert.equal(highImpact.executionAllowed, false);

console.log("Fresh Astra coordinator safety and routing tests: PASS");
