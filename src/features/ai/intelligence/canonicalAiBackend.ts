import type {
  IntelligenceRequest,
  IntelligenceResponse,
  IntelligenceSource,
  ResearchVerification,
} from "./intelligenceConnectors";

export type CanonicalAIResponse = {
  answer?: string;
  source?: string;
  confidence?: "low" | "medium" | "high";
  evidence?: Array<{
    title: string;
    snippet?: string;
    publishedAt?: string;
    kind?: IntelligenceSource["kind"];
  }>;
  verification?: ResearchVerification;
};

/**
 * Canonical Fresh AI transport.
 *
 * All product-level intelligence requests should cross this boundary. The
 * legacy connector registry remains a compatibility surface while callers
 * migrate away from connector-specific execution.
 */
export async function runCanonicalAI(
  request: IntelligenceRequest,
): Promise<IntelligenceResponse> {
  const goal = (request.query ?? request.prompt).trim();
  if (!goal) throw new Error("An intelligence request is required.");

  const response = await fetch("/api/ai/ask", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      goal,
      route: request.researchMode ? `/search/${request.researchMode}` : "/",
      conversation: [],
    }),
  });

  if (!response.ok) {
    let message = `Fresh AI failed with HTTP ${response.status}.`;
    try {
      const failure = (await response.json()) as { error?: string };
      if (failure.error) message = failure.error;
    } catch {
      // Keep the HTTP diagnostic when the response is not JSON.
    }
    throw new Error(message);
  }

  const payload = (await response.json()) as CanonicalAIResponse;
  const sources: IntelligenceSource[] = (payload.evidence ?? []).map(
    (item, index) => ({
      title: item.title,
      url: "",
      snippet: item.snippet,
      publishedAt: item.publishedAt,
      provider: payload.source ?? "Fresh AI",
      kind: item.kind ?? "web",
    }),
  );

  return {
    text: payload.answer ?? "Fresh AI completed the request without a text answer.",
    provider: payload.source ?? "Fresh AI",
    sources,
    confidence: payload.confidence ?? payload.verification?.confidence,
    verification: payload.verification,
    researchMode: request.researchMode,
    searchedAt: new Date().toISOString(),
  };
}
