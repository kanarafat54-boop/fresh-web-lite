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
