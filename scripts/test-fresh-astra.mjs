import assert from "node:assert/strict";
import { coordinateFreshAstra, assertFreshAstraIntegrity } from "../src/core/fresh-ai/FreshAstra.ts";

assertFreshAstraIntegrity();
const mission = coordinateFreshAstra("Help me learn and build systems for my business and operate my digital world");
assert.equal(mission.mission, "personal-and-universal-intelligence");
assert.equal(mission.simulation.mode, "software-in-the-loop");
assert.equal(mission.simulation.physicalControl, false);
assert.equal(mission.simulation.physicsValidated, false);
assert.ok(mission.modalityRuntime.some((item) => item.modality === "image"));
assert.ok(mission.modalityRuntime.every((item) => item.state !== "ready"));
assert.deepEqual(mission.operatingModes, ["personal-intelligence", "universal-infrastructure"]);
assert.ok(mission.modules.some((item) => item.id === "learning"));
assert.ok(mission.modules.some((item) => item.id === "economy"));
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
assert.equal(robot.simulation.physicalControl, false);
assert.ok(robot.limitations.some((item) => item.includes("Physical actuation is blocked")));
assert.equal(robot.modules.find((item) => item.id === "robotics")?.readiness, "contracted");

const highImpact = coordinateFreshAstra("Delete the production database");
assert.equal(highImpact.risk, "high");
assert.equal(highImpact.approvalRequired, true);
assert.equal(highImpact.executionAllowed, false);

const science = coordinateFreshAstra("Design a scientific experiment and simulate its results");
assert.ok(science.modules.some((item) => item.id === "science"));
assert.ok(science.modules.some((item) => item.id === "world-model"));
assert.equal(science.modules.find((item) => item.id === "science")?.readiness, "in-development");

const energy = coordinateFreshAstra("Optimise a village electricity grid and solar battery system");
assert.ok(energy.modules.some((item) => item.id === "energy"));
assert.equal(energy.executionAllowed, false);

const space = coordinateFreshAstra("Analyse satellite imagery and orbital observations");
assert.ok(space.modules.some((item) => item.id === "space"));
assert.ok(space.modules.some((item) => item.id === "vision"));

console.log("Fresh Astra universal mission, module routing and safety tests: PASS");
