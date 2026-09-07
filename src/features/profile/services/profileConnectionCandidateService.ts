import { supabase } from "../../../lib/supabase";
import type { ProfileSuggestionCandidate } from "../models/profileConnectionSuggestions";
import type { ProfileActivity } from "../types/profile";

const text = (value: unknown) => typeof value === "string" ? value : "";

export async function loadProfileSuggestionCandidates(userId: string, limit = 40): Promise<ProfileSuggestionCandidate[]> {
  const { data: users, error } = await supabase
    .from("users")
    .select("id,username,full_name,avatar_url,identity,stats")
    .neq("id", userId)
    .limit(limit);

  if (error) throw error;

  const candidates: ProfileSuggestionCandidate[] = (users ?? []).map((row) => {
    const identity = row.identity && typeof row.identity === "object" ? row.identity as Record<string, unknown> : {};
    const stats = row.stats && typeof row.stats === "object" ? row.stats as Record<string, unknown> : {};
    return {
      id: String(row.id),
      displayName: text(row.full_name) || text(row.username) || "Fresh user",
      username: text(row.username),
      avatar: text(row.avatar_url) || text(identity.avatar_url),
      interests: Array.isArray(identity.interests) ? identity.interests.map(String) : [],
      skills: Array.isArray(identity.skills) ? identity.skills.map(String) : [],
      occupation: text(identity.occupation),
      company: text(identity.company),
      followerCount: Number(stats.followerCount ?? 0),
    };
  });

  return candidates;
}
