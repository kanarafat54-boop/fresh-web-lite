import type { ProfileActivity, UniversalProfile } from "../types/profile";
import type { OrganizedProfileActivity, ProfileContentTheme, ProfileContentThemeGroup } from "../models/profileContentOrganization";
import { PROFILE_CONTENT_THEMES } from "../models/profileContentOrganization";

const KEYWORDS: Record<ProfileContentTheme, string[]> = {
  Technology: ["ai", "software", "code", "coding", "developer", "development", "app", "web", "tech", "computer", "digital", "data", "api", "robot", "cloud", "github"],
  Business: ["business", "startup", "founder", "company", "market", "finance", "money", "sales", "brand", "marketing", "investment", "entrepreneur"],
  Education: ["learn", "learning", "education", "course", "school", "study", "lesson", "tutorial", "academy", "research", "book", "knowledge"],
  Creative: ["design", "creative", "art", "music", "photo", "photography", "video", "podcast", "writing", "story", "film", "creator"],
  Entertainment: ["movie", "movies", "show", "gaming", "game", "fun", "entertainment", "music", "comedy", "concert"],
  Lifestyle: ["life", "travel", "food", "fashion", "fitness", "health", "home", "daily", "lifestyle", "wellness"],
  Science: ["science", "physics", "biology", "chemistry", "space", "climate", "experiment", "scientific", "engineering"],
  Sports: ["sport", "football", "soccer", "basketball", "tennis", "running", "athlete", "match", "league", "fitness"],
  Community: ["community", "group", "people", "social", "volunteer", "charity", "event", "local", "together"],
  Other: [],
};

function normalize(value: string): string[] {
  return value.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).filter(Boolean);
}

function scoreTheme(item: ProfileActivity, profile: UniversalProfile, theme: ProfileContentTheme): number {
  if (theme === "Other") return 0;
  const source = normalize(`${item.title} ${item.text} ${profile.interests.join(" ")} ${profile.skills.join(" ")}`);
  const keywords = new Set(KEYWORDS[theme]);
  return source.reduce((score, word) => score + (keywords.has(word) ? 1 : 0), 0);
}

function classify(item: ProfileActivity, profile: UniversalProfile): { theme: ProfileContentTheme; relevance: number } {
  const ranked = PROFILE_CONTENT_THEMES.filter((theme) => theme !== "Other")
    .map((theme) => ({ theme, score: scoreTheme(item, profile, theme) }))
    .sort((a, b) => b.score - a.score);
  const winner = ranked[0];
  return winner && winner.score > 0 ? { theme: winner.theme, relevance: winner.score } : { theme: "Other", relevance: 0 };
}

export function organizeProfileActivity(profile: UniversalProfile): OrganizedProfileActivity[] {
  return profile.activity.map((item) => ({ ...item, ...classify(item, profile) }));
}

export function groupProfileActivity(profile: UniversalProfile): ProfileContentThemeGroup[] {
  const groups = new Map<ProfileContentTheme, OrganizedProfileActivity[]>();
  for (const item of organizeProfileActivity(profile)) {
    const current = groups.get(item.theme) ?? [];
    current.push(item);
    groups.set(item.theme, current);
  }
  return [...groups.entries()]
    .map(([theme, items]) => ({ theme, items, count: items.length }))
    .sort((a, b) => b.count - a.count || a.theme.localeCompare(b.theme));
}
