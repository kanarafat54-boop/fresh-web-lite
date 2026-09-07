export type ProfileAudience = "public" | "connections" | "private";

export interface ProfileVisibility {
  public: boolean;
  connections: boolean;
  private: boolean;
}

export interface ProfileActivity {
  id: string;
  kind: "post" | "short" | "project" | "portfolio";
  title: string;
  text: string;
  mediaUrl: string | null;
  createdAt: string;
  engagement?: number;
}

export interface ProfileConnection {
  provider: string;
  handle?: string;
  connected: boolean;
  verified?: boolean;
}

export interface ProfileInsight {
  label: string;
  value: string;
  reason: string;
}

export interface ProfileHighlight {
  id: string;
  title: string;
  kind: ProfileActivity["kind"];
  text: string;
  createdAt: string;
  mediaUrl: string | null;
  score: number;
}

export interface SmartProfileData {
  summary: string;
  interests: string[];
  highlights: ProfileHighlight[];
  insights: ProfileInsight[];
  generatedBy: "fresh-intelligence" | "gemini";
  generatedAt: string;
}

export interface UniversalProfile {
  id: string;
  freshId: string;
  username: string;
  displayName: string;
  email: string;
  avatar: string;
  coverPhoto: string;
  bio: string;
  location: string;
  website: string;
  verified: boolean;
  joinedAt: string;
  languages: string[];
  interests: string[];
  skills: string[];
  occupation: string;
  company: string;
  pronouns: string;
  followerCount: number;
  followingCount: number;
  postCount: number;
  shortCount: number;
  reputationScore: number;
  connections: ProfileConnection[];
  activity: ProfileActivity[];
  visibility: ProfileVisibility;
}
