export interface UniversalProfile {
  id: string;
  freshId: string;
  /** Stable public handle. This remains the same across every ecosystem. */
  username: string;
  /** Everyday-life name shown as the person's primary identity. */
  displayName: string;
  avatar: string;
  coverImage: string;
  bio: string;
  location: string;
  website: string;
  verified: boolean;
  joinedAt: string;
  interests: string[];
  skills: string[];
  languages: string[];
}
