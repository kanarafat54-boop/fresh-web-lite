import type { SupabaseClient } from "@supabase/supabase-js";
import type { Evidence } from "./FreshAIArchitecture.js";

/**
 * Shared platform-knowledge retrieval for every Fresh AI endpoint.
 * Postgres full-text search only: no outside AI model is involved.
 */
const KB_PROJECT = "fresh-web-lite-platform";
const IDENTITY = /\b(who are you|what are you|what can you do|what are you able|introduce yourself|your (abilities|capabilities|powers))\b/i;
const EXTERNAL_FACT_QUESTION = /^\s*(?:who|what|when|where|why|how)\s+(?:is|was|are|were|did|does|do|has|have)\s+(?!you\b|your\b|fresh ai\b|fresh\b)[A-Z][A-Za-z0-9.-]*(?:\s+[A-Z][A-Za-z0-9.-]*)*/i;
const STOP = new Set(["fresh", "what", "does", "about", "that", "this", "have", "your", "from", "tell", "show", "explain", "please", "there", "their", "which", "would", "could", "should", "when", "where", "into", "than", "then", "them", "they", "been", "being", "also", "just", "like", "make", "made", "more", "most", "some", "such", "only", "over", "very", "will", "with", "lite", "web", "work", "works"]);

type Row = { id: string; title: string; content: string; source: string | null; confidence: number | string | null; rank?: number | string };

const toEvidence = (x: Row): Evidence => ({
  id: `kb-${x.id}`,
  source: x.source || "fresh-platform-knowledge",
  claim: `${x.title}: ${x.content}`.slice(0, 900),
  confidence: Number.isFinite(Number(x.confidence)) ? Number(x.confidence) : 0.9,
}) as Evidence;

export async function retrieveFreshPlatformKnowledge(client: SupabaseClient | null, goal: string): Promise<Evidence[]> {
  if (!client || !goal.trim()) return [];

  // Product documentation must never answer an unrelated question about a
  // public person or outside topic. Those questions belong to web research.
  if (EXTERNAL_FACT_QUESTION.test(goal.trim())) return [];

  const ranked = await client.rpc("search_fresh_platform_knowledge", { p_query: IDENTITY.test(goal) ? "ai assistant capabilities" : goal, p_limit: 4 });
  if (!ranked.error && Array.isArray(ranked.data)) {
    const rows = ranked.data as Row[];
    const best = rows.reduce((m, x) => Math.max(m, Number(x.rank) || 0), 0);
    // Do not unconditionally accept row zero: a zero-score result is not evidence.
    if (best <= 0) return [];
    return rows.filter((x) => (Number(x.rank) || 0) > 0 && (Number(x.rank) || 0) >= best * 0.6).map(toEvidence);
  }

  // Fallback when the database function is not installed yet: simple word matching.
  const words = Array.from(new Set(goal.toLowerCase().split(/\s+/).map((w) => w.replace(/[^a-z0-9]/g, "")).filter((w) => w.length > 3 && !STOP.has(w)))).slice(0, 10);
  if (!words.length) return [];
  const r = await client.from("fresh_ai_knowledge").select("id,title,content,source,confidence").is("user_id", null).eq("project_id", KB_PROJECT).limit(200);
  if (r.error || !r.data) return [];
  return (r.data as Row[])
    .map((x) => {
      const title = x.title.toLowerCase(), content = x.content.toLowerCase();
      return { x, score: words.reduce((n, w) => n + (title.includes(w) ? 2 : 0) + (content.includes(w) ? 1 : 0), 0) };
    })
    .filter((s) => s.score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(({ x }) => toEvidence(x));
}
