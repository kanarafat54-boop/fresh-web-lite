import type {
  IntelligenceConnector,
  IntelligenceRequest,
  IntelligenceResponse,
  IntelligenceSource,
  ResearchMode,
} from "./intelligenceConnectors";

/**
 * Global web research adapter.
 *
 * Provider credentials stay server-side. The browser talks only to Fresh's
 * research endpoint, which can fan out to authorized search providers.
 */
export const webResearchConnector: IntelligenceConnector = {
  id: "fresh-web-research",
  name: "Fresh Web Research",
  tasks: ["research", "answer", "science", "biology", "coding", "planning"],
  isAvailable: () => true,
  async run(request: IntelligenceRequest): Promise<IntelligenceResponse> {
    const query = (request.query ?? request.prompt).trim();
    if (!query) throw new Error("A research query is required.");

    const researchMode: ResearchMode = request.researchMode ?? "global";
    const response = await fetch("/api/research/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query,
        maxSources: Math.min(Math.max(request.maxSources ?? (researchMode === "deep" || researchMode === "global" ? 12 : 8), 1), 20),
        context: request.context ?? [],
        mode: researchMode,
      }),
    });

    if (!response.ok) {
      let message = `Fresh Web Research failed with HTTP ${response.status}.`;
      try {
        const failure = (await response.json()) as { error?: string };
        if (failure.error) message = failure.error;
      } catch {
        // Preserve the HTTP-level diagnostic when the provider returns no JSON.
      }
      throw new Error(message);
    }

    const payload = (await response.json()) as {
      answer?: string;
      sources?: IntelligenceSource[];
      mode?: ResearchMode;
    };

    return {
      provider: this.name,
      text: payload.answer ?? "Research results received without a synthesized answer.",
      sources: payload.sources ?? [],
      confidence: payload.sources?.length && payload.sources.length >= 3 ? "medium" : "low",
      researchMode: payload.mode ?? researchMode,
    };
  },
};
