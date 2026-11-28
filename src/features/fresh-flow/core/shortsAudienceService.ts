import { supabase } from "../../../lib/supabase";

export type ShortAudience = "public" | "followers" | "private";

export const SHORT_AUDIENCE_OPTIONS: readonly { id: ShortAudience; label: string; hint: string }[] = [
  { id: "public", label: "Public", hint: "Anyone can watch." },
  { id: "followers", label: "Followers", hint: "Only people who follow you." },
  { id: "private", label: "Only me", hint: "Only you can watch." },
];

export function isShortAudience(value: unknown): value is ShortAudience {
  return value === "public" || value === "followers" || value === "private";
}

/** The Short's current audience, read by its creator. Falls back to "public" when the column does not exist yet. */
export async function loadShortAudience(shortId: string): Promise<ShortAudience> {
  const { data, error } = await supabase.from("shorts").select("audience").eq("id", shortId).maybeSingle();
  if (error || !data) return "public";
  return isShortAudience((data as { audience?: unknown }).audience) ? (data as { audience: ShortAudience }).audience : "public";
}

/** Only the creator can change this: the database allows the update for the Short's author alone. */
export async function setShortAudience(userId: string, shortId: string, audience: ShortAudience): Promise<ShortAudience> {
  const { data, error } = await supabase
    .from("shorts")
    .update({ audience })
    .eq("id", shortId)
    .eq("author_id", userId)
    .select("audience")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || !isShortAudience((data as { audience?: unknown }).audience)) throw new Error("Only the creator can change who can watch this Short.");
  return (data as { audience: ShortAudience }).audience;
}
