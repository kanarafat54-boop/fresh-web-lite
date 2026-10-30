import assert from "node:assert/strict";
import { FRESH_AI_BACKEND_READINESS, assertFreshAIBackendReadinessIntegrity } from "../src/core/fresh-ai/FreshAIBackendReadiness.ts";
assertFreshAIBackendReadinessIntegrity();
assert.ok(FRESH_AI_BACKEND_READINESS.some((item) => item.id === "neuro-symbolic" && item.status === "active"));
assert.ok(FRESH_AI_BACKEND_READINESS.some((item) => item.id === "agi" && item.status === "research-only"));
assert.ok(FRESH_AI_BACKEND_READINESS.some((item) => item.id === "embodied" && item.status === "hardware-required"));
console.log("Fresh AI backend readiness registry: PASS");
