import {
  FRESH_PHASE_15_22,
  FRESH_PHASE_15_22_STEP_COUNT,
  assertFreshPhase15To22Integrity,
  createAIAction,
  createContentItem,
  createCreatorProject,
  createGovernanceCase,
  createIdentitySession,
  createMemoryItem,
  createMoneyOperation,
  createRealtimeEvent,
  rankFreshCandidates,
} from "../src/core/platform/freshCompletionFabric.ts";

assertFreshPhase15To22Integrity();
if (FRESH_PHASE_15_22_STEP_COUNT !== 80) throw new Error("Expected exactly 80 steps across phases 15-22");

const identity = createIdentitySession("test-user", "/");
if (!identity.sessionId || !identity.deviceId) throw new Error("Identity session is not executable");

const action = createAIAction("Publish", true);
if (action.state !== "approval-required") throw new Error("AI approval boundary failed");

const memory = createMemoryItem("test-user", "important context", "test", 0.8);
if (memory.importance !== 0.8) throw new Error("Memory importance failed");

const content = createContentItem({ authorId: "test-user", format: "short", title: "test" });
if (content.status !== "draft") throw new Error("Content lifecycle failed");

const ranked = rankFreshCandidates([
  { ...content, subscription: 0.1, niche: 0.1, length: 0.1, freshness: 0.1 },
  { ...content, id: "candidate-2", subscription: 0.9, niche: 0.9, length: 0.9, freshness: 0.9 },
], { subscription: 0.25, niche: 0.25, length: 0.15, freshness: 0.35 });
if (ranked[0].id !== "candidate-2") throw new Error("Recommendation ranking failed");

const project = createCreatorProject("test-user", "Studio project");
if (project.version !== 1) throw new Error("Creator project versioning failed");

const realtime = createRealtimeEvent("channel", "test-user", "reaction", { reaction: "like" });
if (realtime.kind !== "reaction") throw new Error("Realtime event failed");

const money = createMoneyOperation("test-user", "earning", 1000, "ugx");
if (money.state !== "pending" || money.amountMinor !== 1000) throw new Error("Money boundary failed");

const governance = createGovernanceCase("content-1", "copyright");
if (governance.state !== "open") throw new Error("Governance case failed");

console.log("Fresh phases 15-22 certification passed: 80 steps, core lifecycle, AI approval, memory, Flow, recommendation, creator versioning, realtime, money, governance.");
