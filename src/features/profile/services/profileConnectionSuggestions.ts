import type { ProfileActivity, UniversalProfile } from "../types/profile";
import type { ProfileConnectionSuggestionEngine, ProfileSuggestionCandidate } from "../models/profileConnectionSuggestions";

function words(values: string[]): Set<string> {
  return new Set(values.flatMap((value) => value.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).filter((word) => word.length > 2)));
}

function activityWords(activity: ProfileActivity[]): Set<string> {
  return words(activity.flatMap((item) => [item.title, item.text]));
}

function intersection(a: Set<string>, b: Set<string>): string[] {
  return [...a].filter((word) => b.has(word));
}

function candidateSignals(profile: UniversalProfile, candidate: ProfileSuggestionCandidate) {
  const profileInterests = words([...profile.interests, ...profile.skills]);
  const candidateInterests = words([...(candidate.interests ?? []), ...(candidate.skills ?? [])]);
  const sharedInterests = intersection(profileInterests, candidateInterests);

  const profileActivity = activityWords(profile.activity);
  const candidateActivity = activityWords(candidate.activity ?? []);
  const sharedActivity = intersection(profileActivity, candidateActivity);

  const sameWorkplace = Boolean(profile.company && candidate.company && profile.company.toLowerCase() === candidate.company.toLowerCase());
  const sameOccupation = Boolean(profile.occupation && candidate.occupation && profile.occupation.toLowerCase() === candidate.occupation.toLowerCase());

  const signals: string[] = [];
  if (sharedInterests.length) signals.push(`${sharedInterests.slice(0, 3).join(", ")} interests`);
  if (sharedActivity.length) signals.push(`${sharedActivity.slice(0, 2).join(", ")} activity`);
  if (sameWorkplace) signals.push(`works at ${candidate.company}`);
  else if (sameOccupation) signals.push(`both ${candidate.occupation}`);

  const score = Math.min(100, sharedInterests.length * 15 + sharedActivity.length * 8 + (sameWorkplace ? 25 : 0) + (sameOccupation ? 15 : 0));
  return { score, signals };
}

export const profileConnectionSuggestionEngine: ProfileConnectionSuggestionEngine = {
  suggest(profile, candidates, limit = 6) {
    return candidates
      .filter((candidate) => candidate.id !== profile.id)
      .map((candidate) => {
        const { score, signals } = candidateSignals(profile, candidate);
        return {
          id: candidate.id,
          displayName: candidate.displayName,
          username: candidate.username,
          avatar: candidate.avatar ?? "",
          reason: signals.length ? `Because you share ${signals[0]}.` : "Suggested from your Fresh profile context.",
          score,
          signals,
        };
      })
      .filter((candidate) => candidate.score > 0)
      .sort((a, b) => b.score - a.score || a.displayName.localeCompare(b.displayName))
      .slice(0, limit);
  },
};
