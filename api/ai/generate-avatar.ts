import { generateFreshNeuralMedia } from "../../src/core/fresh-ai/FreshNeuralGenerationRuntime.js";

export const config = { maxDuration: 60 };

const json = (value: unknown, status = 200) => Response.json(value, {
  status,
  headers: { "cache-control": "no-store" },
});

export async function POST(req: Request): Promise<Response> {
  const requestId = crypto.randomUUID();
  try {
    const body = await req.json() as { prompt?: string; userId?: string };
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    if (!prompt) return json({ error: "A prompt is required" }, 400);
    if (prompt.length > 4000) return json({ error: "Keep the prompt under 4,000 characters" }, 400);

    const result = generateFreshNeuralMedia({
      kind: "avatar",
      prompt,
      userId: typeof body.userId === "string" ? body.userId : undefined,
      size: "1024x1024",
    });

    if (result.status !== "ready" || !result.output) {
      return json({
        requestId,
        error: "Fresh AI neural avatar generation is not serving yet.",
        status: result.status,
        model: result.modelId,
        native: true,
        reason: result.reason,
      }, 503);
    }

    return json({ requestId, model: result.modelId, native: true, generatedImage: { dataUrl: `data:${result.output.mimeType};base64,${result.output.b64Json}` } });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Fresh AI avatar generation failed" }, 500);
  }
}
