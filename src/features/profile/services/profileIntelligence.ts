import type { ProfileActivity, ProfileHighlight, ProfileInsight, SmartProfileData, UniversalProfile } from "../types/profile";

const STOP_WORDS = new Set(["the", "and", "for", "with", "that", "this", "your", "from", "have", "will", "into", "about", "are", "you", "not", "but", "our", "was", "has", "how", "can", "all"]);

function tokens(value: string): string[] {
  return value.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).filter((word) => word.length > 3 && !STOP_WORDS.has(word));
}

function buildInterests(profile: UniversalProfile): string[] {
  const counts = new Map<string, number>();
  [...profile.interests, ...profile.skills, ...profile.activity.flatMap((item) => tokens(`${item.title} ${item.text}`))].forEach((item) => {
    const key = item.trim().toLowerCase();
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([word]) => word);
}

function scoreActivity(item: ProfileActivity, now: number): number {
  const ageDays = Math.max(0, (now - new Date(item.createdAt).getTime()) / 86_400_000);
  const freshness = Math.max(0, 40 - ageDays * 2);
  const engagement = Math.min(40, Math.log10(Math.max(1, item.engagement ?? 0) + 1) * 20);
  const media = item.mediaUrl ? 10 : 0;
  return Math.round(freshness + engagement + media);
}

function buildHighlights(activity: ProfileActivity[]): ProfileHighlight[] {
  const now = Date.now();
  return activity.map((item) => ({
    id: item.id,
    title: item.title,
    kind: item.kind,
    text: item.text,
    createdAt: item.createdAt,
    mediaUrl: item.mediaUrl,
    score: scoreActivity(item, now),
  })).sort((a, b) => b.score - a.score).slice(0, 5);
}

function buildInsights(profile: UniversalProfile, highlights: ProfileHighlight[]): ProfileInsight[] {
  const mediaCount = profile.activity.filter((item) => Boolean(item.mediaUrl)).length;
  const recentCount = profile.activity.filter((item) => Date.now() - new Date(item.createdAt).getTime() <= 30 * 86_400_000).length;
  return [
    { label: "Content mix", value: `${mediaCount}/${profile.activity.length || 0} media`, reason: "Based on media attached to stored Fresh Flow activity." },
    { label: "Recent activity", value: `${recentCount} in 30 days`, reason: "Counts only real activity timestamps available to this Fresh ID." },
    { label: "Top signal", value: highlights[0]?.kind ?? "none", reason: "Selected from freshness, available engagement and media signals." },
    { label: "Network", value: `${profile.followerCount} followers`, reason: "Uses the persisted Fresh follow graph." },
  ];
}

export function curateSmartProfile(profile: UniversalProfile): SmartProfileData {
  const highlights = buildHighlights(profile.activity);
  const interests = buildInterests(profile);
  const identity = [profile.occupation, profile.company].filter(Boolean).join(" at ");
  const summary = identity
    ? `${profile.displayName} is ${identity}. Fresh Intelligence is organizing the profile around ${interests.slice(0, 3).join(", ") || "their recent activity"}.`
    : `${profile.displayName}'s Fresh profile is being organized from their real identity, interests and Fresh Flow activity.`;

  return {
    summary,
    interests,
    highlights,
    insights: buildInsights(profile, highlights),
    generatedBy: "fresh-intelligence",
    generatedAt: new Date().toISOString(),
  };
}
