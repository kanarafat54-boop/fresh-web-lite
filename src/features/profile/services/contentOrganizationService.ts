import { supabase } from "../../../lib/supabase";

export type OrganizedContentGroup = {
  key: string;
  label: string;
  shortIds: string[];
};

/**
 * Real auto-organization: groups a user's own Shorts by their actual
 * `category` column (relax/learn) -- the same real field ShortsModule and
 * Fresh Flow already use, not a fabricated theming/AI-tagging system.
 */
export async function getOrganizedShorts(userId: string): Promise<OrganizedContentGroup[]> {
  const { data, error } = await supabase.from("shorts").select("id, category, created_at").eq("author_id", userId);
  if (error) throw new Error(error.message);

  const groups = new Map<string, string[]>();
  for (const row of data ?? []) {
    const key = row.category ?? "uncategorized";
    const list = groups.get(key) ?? [];
    list.push(row.id);
    groups.set(key, list);
  }

  const labels: Record<string, string> = { relax: "Relax", learn: "Learn", uncategorized: "Other" };
  return Array.from(groups.entries()).map(([key, shortIds]) => ({ key, label: labels[key] ?? key, shortIds }));
}
