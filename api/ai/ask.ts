import { createClient } from "@supabase/supabase-js";

export const config = { maxDuration: 30 };

type RequestBody = { goal?: string; route?: string };

type GeminiResponse = { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { "cache-control": "no-store" } });
}

async function authenticatedUser(req: Request) {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  const authorization = req.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!url || !key || !token) return null;
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data } = await client.auth.getUser(token);
  return data.user ?? null;
}

async function providerAnswer(goal: string, route: string): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) return null;

  const model = process.env.FRESH_AI_MODEL || "gemini-2.5-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: "You are Fresh AI, the assistant inside Fresh Web Lite. Be practical, concise, honest about uncertainty, and never claim an action was completed unless it actually was. The current product is a unified identity, social, work, learning, creator, marketplace and intelligence platform." }] },
      contents: [{ role: "user", parts: [{ text: `Current Fresh workspace: ${route}\nUser request: ${goal}` }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 700 },
    }),
  });
  if (!response.ok) return null;
  const payload = (await response.json()) as GeminiResponse;
  return payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim() || null;
}

function nativeAnswer(goal: string, route: string): string {
  const normalized = goal.toLowerCase();
  if (normalized.includes("what can you do") || normalized.includes("help")) {
    return `Fresh AI is active in ${route}. I can help you understand this workspace, plan a task, summarize information you provide, and guide you to the next Fresh feature. For deeper reasoning, open the full Fresh AI workspace.`;
  }
  if (normalized.includes("where") || normalized.includes("find")) {
    return `You are currently in ${route}. Use Fresh Search for platform-wide discovery, or open the relevant workspace from the navigation. I can also help you decide which Fresh workspace fits the task.`;
  }
  if (normalized.includes("plan") || normalized.includes("next")) {
    return `A good next step from ${route} is to define the outcome, identify the smallest useful action, then verify the result. Tell me the outcome you want and I will turn it into a concrete plan.`;
  }
  return `Fresh AI received your request in ${route}. The native Fresh intelligence boundary is working, but no external language-model provider is configured for this deployment yet. You can still use the full Fresh AI workspace for the platform's native capabilities.`;
}

export async function POST(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as RequestBody;
    const goal = typeof body.goal === "string" ? body.goal.trim() : "";
    const route = typeof body.route === "string" && body.route.trim() ? body.route.trim().slice(0, 120) : "/";
    if (!goal) return json({ error: "A goal is required" }, 400);
    if (goal.length > 4000) return json({ error: "Keep the request under 4,000 characters" }, 400);

    const user = await authenticatedUser(req);
    const answer = await providerAnswer(goal, route).catch(() => null);
    return json({
      answer: answer ?? nativeAnswer(goal, route),
      confidence: answer ? "SUPPORTED" : "KNOWN",
      source: answer ? "Fresh AI provider" : "Fresh native intelligence boundary",
      authenticated: Boolean(user),
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Fresh AI request failed" }, 500);
  }
}
