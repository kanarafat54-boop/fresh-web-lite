import { supabase } from "../../../lib/supabase";
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
  authenticated?: boolean;
  intent?: string;
  evidence?: Array<{
    title: string;
    url?: string;
    snippet?: string;
    publishedAt?: string;
    kind?: IntelligenceSource["kind"];
  }>;
  verification?: ResearchVerification;
};

/**
 * Canonical Fresh AI transport.
 *
 * All product-level intelligence requests cross this boundary. The legacy
 * connector registry remains a compatibility surface while callers migrate
 * away from connector-specific execution.
 */
export async function runCanonicalAI(
  request: IntelligenceRequest,
): Promise<IntelligenceResponse> {
  const goal = (request.query ?? request.prompt).trim();
  if (!goal) throw new Error("An intelligence request is required.");

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const response = await fetch("/api/ai/ask", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(session?.access_token
        ? { authorization: `Bearer ${session.access_token}` }
        : {}),
    },
    body: JSON.stringify({
      goal,
      route: request.researchMode ? `/search/${request.researchMode}` : "/",
      conversation: request.conversation?.slice(-8) ?? [],
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
    (item) => ({
      title: item.title,
      url: item.url ?? "",
      snippet: item.snippet,
      publishedAt: item.publishedAt,
      provider: payload.source ?? "Fresh AI",
      kind: item.kind ?? "web",
    }),
  );

  return {
    text:
      payload.answer ??
      "Fresh AI completed the request without a text answer.",
    provider: payload.source ?? "Fresh AI",
    sources,
    confidence: payload.confidence ?? payload.verification?.confidence,
    verification: payload.verification,
    researchMode: request.researchMode,
    searchedAt: new Date().toISOString(),
  };
}
