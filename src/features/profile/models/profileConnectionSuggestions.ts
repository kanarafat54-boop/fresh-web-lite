import type { ProfileActivity, UniversalProfile } from "../types/profile";

export interface ProfileConnectionSuggestion {
  id: string;
  displayName: string;
  username: string;
  avatar: string;
  reason: string;
  score: number;
  signals: string[];
}

export interface ProfileSuggestionCandidate {
  id: string;
  displayName: string;
  username: string;
  avatar?: string;
  interests?: string[];
  skills?: string[];
  activity?: ProfileActivity[];
  occupation?: string;
  company?: string;
  followerCount?: number;
}

export interface ProfileConnectionSuggestionEngine {
  suggest(profile: UniversalProfile, candidates: ProfileSuggestionCandidate[], limit?: number): ProfileConnectionSuggestion[];
}
