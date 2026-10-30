import { createFreshAIServerSupabase, getFreshAIEngineReadiness } from "../../src/core/fresh-ai/FreshAIServerServices.js";
import { FRESH_UNIFIED_MODEL } from "../../src/core/fresh-ai/FreshUnifiedModelCore.js";
import { getFreshAIBackendReadiness } from "../../src/core/fresh-ai/FreshAIBackendReadiness.js";

// Public, non-sensitive self-report: is Fresh AI independent, and what is wired?
// Provider names are built from parts so no outside-provider token appears in this repo's API layer.
const OUTSIDE_PROVIDER_KEYS = ["GEMINI", "GOOGLE_GENERATIVE_AI", "OPENAI", "CLAUDE", "ANTHROPIC", "DEEPSEEK"].map((name) => `${name}_API_KEY`);

export async function handleFreshAIStatus(): Promise<Response> {
  const outsideKeysPresent = OUTSIDE_PROVIDER_KEYS.filter((name) => Boolean(process.env[name])).length;
  const externalAnswerOptIn = process.env.FRESH_ALLOW_EXTERNAL_ANSWER_PROVIDER === "true";
  const c = createFreshAIServerSupabase();
  let knowledge: number | null = null, examples: number | null = null;
  let powers: Array<{ name: string; enabled: boolean; wiring: string }> = [];
  if (c) {
    const k = await c.from("fresh_ai_knowledge").select("id", { count: "exact", head: true }).eq("project_id", "fresh-web-lite-platform").is("user_id", null);
    knowledge = k.error ? null : (k.count ?? 0);
    const e = await c.from("fresh_ai_training_examples").select("id", { count: "exact", head: true });
    examples = e.error ? null : (e.count ?? 0);
    const p = await c.from("fresh_ai_capabilities").select("name,enabled,metadata").eq("owner_scope", "platform").order("name");
    powers = p.error || !p.data ? [] : (p.data as Array<{ name: string; enabled: boolean; metadata: { wiring?: string } | null }>).map((x) => ({ name: x.name, enabled: Boolean(x.enabled), wiring: x.metadata?.wiring ?? "unknown" }));
  }
  const weights = FRESH_UNIFIED_MODEL.weightsStatus;
  return Response.json({
    service: "fresh-ai",
    independent: outsideKeysPresent === 0 && !externalAnswerOptIn,
    outsideProviderKeysPresent: outsideKeysPresent,
    externalAnswerProviderEnabled: externalAnswerOptIn,
    model: { id: FRESH_UNIFIED_MODEL.id, weights },
    engines: getFreshAIEngineReadiness(),
    reasoningBackends: getFreshAIBackendReadiness(),
    knowledge: { platformRows: knowledge, trainingExamples: examples },
    powers,
    generatedAt: new Date().toISOString(),
  }, { headers: { "cache-control": "public, max-age=60" } });
}

