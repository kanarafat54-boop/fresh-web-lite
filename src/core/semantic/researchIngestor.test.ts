import { describe, expect, it, beforeEach } from "vitest";
import { semanticStore } from "./semanticStore";
import { ingestResearchEvidence } from "./researchIngestor";

describe("research evidence ingestion", () => {
  beforeEach(() => semanticStore.clear());

  it("stores provenance-preserving web evidence", () => {
    const evidence = ingestResearchEvidence({
      answer: "A synthesized answer",
      searchedAt: "2026-08-08T00:00:00.000Z",
      confidence: "high",
      sources: [{
        title: "Example source",
        url: "https://example.com/article",
        snippet: "A source-backed observation.",
        provider: "Tavily",
      }],
    });

    expect(evidence).toHaveLength(1);
    expect(semanticStore.getEvidenceForUrl("https://example.com/article")).toHaveLength(1);
    expect(evidence[0].provider).toBe("Tavily");
    expect(evidence[0].supports).toBe(true);
  });
});
