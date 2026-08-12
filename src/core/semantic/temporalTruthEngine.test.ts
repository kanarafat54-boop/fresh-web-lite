import { describe, expect, it } from "vitest";
import { assessTemporalTruth } from "./temporalTruthEngine";
import type { SemanticClaim } from "./types";

const claim = (overrides: Partial<SemanticClaim> = {}): SemanticClaim => ({
  id: "claim-1",
  statement: "Example claim",
  predicate: "is",
  object: "true",
  status: "supported",
  confidence: 0.9,
  evidenceIds: [],
  counterEvidenceIds: [],
  firstObservedAt: "2026-01-01T00:00:00Z",
  lastObservedAt: "2026-01-02T00:00:00Z",
  validFrom: "2026-01-01T00:00:00Z",
  validTo: "2026-02-01T00:00:00Z",
  ...overrides,
});

describe("temporal truth engine", () => {
  it("classifies an active supported claim as currently true", () => {
    expect(assessTemporalTruth(claim(), "2026-01-15T00:00:00Z").status).toBe("CURRENTLY_TRUE");
  });
  it("preserves expired claims as historical truth", () => {
    expect(assessTemporalTruth(claim(), "2026-03-01T00:00:00Z").status).toBe("HISTORICALLY_TRUE");
  });
  it("marks overlapping contradictions as contested", () => {
    expect(assessTemporalTruth(claim(), "2026-01-15T00:00:00Z", { hasContradiction: true }).status).toBe("CONTESTED");
  });
  it("defers claims requiring human review", () => {
    expect(assessTemporalTruth(claim(), "2026-01-15T00:00:00Z", { requiresReview: true }).status).toBe("DEFERRED");
  });
  it("marks replaced claims as superseded", () => {
    expect(assessTemporalTruth(claim(), "2026-01-15T00:00:00Z", { superseded: true }).status).toBe("SUPERSEDED");
  });
});
