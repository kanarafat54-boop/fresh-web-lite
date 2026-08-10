import type {
  IntelligenceConnector,
  IntelligenceRequest,
  IntelligenceResponse,
  IntelligenceSource,
} from "./intelligenceConnectors";

/**
 * Web research adapter.
 *
 * The browser must never receive search-provider secrets. The production
 * implementation therefore calls Fresh Web Lite's own server-side research
 * endpoint. That endpoint can fan out to authorized search/index providers.
 */
export const webResearchConnector: IntelligenceConnector = {
  id: "fresh-web-research",
  name: "Fresh Web Research",
  tasks: ["research", "answer", "science", "biology", "coding", "planning"],
  isAvailable: () => true,
  async run(request: IntelligenceRequest): Promise<IntelligenceResponse> {
    const query = (request.query ?? request.prompt).trim();
    if (!query) throw new Error("A research query is required.");

    const response = await fetch("/api/research/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query,
        maxSources: Math.min(Math.max(request.maxSources ?? 8, 1), 20),
        context: request.context ?? [],
      }),
    });

    if (!response.ok) {
      throw new Error(`Fresh Web Research failed with HTTP ${response.status}.`);
    }

    const payload = (await response.json()) as {
      answer?: string;
      sources?: IntelligenceSource[];
    };

    return {
      provider: this.name,
      text: payload.answer ?? "Research results received without a synthesized answer.",
      sources: payload.sources ?? [],
      confidence: payload.sources?.length ? "medium" : "low",
    };
  },
};
