import type { ProfileActivity } from "../types/profile";

export const PROFILE_CONTENT_THEMES = [
  "Technology",
  "Business",
  "Education",
  "Creative",
  "Entertainment",
  "Lifestyle",
  "Science",
  "Sports",
  "Community",
  "Other",
] as const;

export type ProfileContentTheme = typeof PROFILE_CONTENT_THEMES[number];

export interface OrganizedProfileActivity extends ProfileActivity {
  theme: ProfileContentTheme;
  relevance: number;
}

export interface ProfileContentThemeGroup {
  theme: ProfileContentTheme;
  items: OrganizedProfileActivity[];
  count: number;
}
