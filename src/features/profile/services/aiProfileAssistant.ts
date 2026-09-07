import { supabase } from "../../../lib/supabase";
import { runIntelligence } from "../../ai/intelligence";

/**
 * Real, honest first version of "AI drafts a post in your voice": uses the
 * user's own recent captions as style context for the AI backend, rather
 * than claiming a fine-tuned voice model that doesn't exist. Quality will
 * be modest -- this is a genuine starting point, not a finished voice-clone.
 */
export async function draftPostInMyVoice(userId: string, topic: string): Promise<string> {
  const { data: recentShorts } = await supabase
    .from("shorts")
    .select("caption")
    .eq("author_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);
  const { data: recentPosts } = await supabase
    .from("posts")
    .select("content")
    .eq("author_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);

  const samples = [
    ...(recentShorts ?? []).map((r: any) => r.caption).filter(Boolean),
    ...(recentPosts ?? []).map((r: any) => r.content).filter(Boolean),
  ].slice(0, 8);

  const prompt = samples.length > 0
    ? `Here are some of this person's recent posts, showing their writing style and tone:\n${samples.map((s) => `- ${s}`).join("\n")}\n\nWrite a new short post about: "${topic}". Match their tone, length, and style as closely as you can from these examples. Return only the post text, nothing else.`
    : `Write a short, natural social post about: "${topic}". Return only the post text, nothing else.`;

  const response = await runIntelligence({ prompt, task: "answer" });
  return response.text.trim();
}
