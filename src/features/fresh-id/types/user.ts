export type UserRole = "user" | "creator" | "admin" | "developer" | "business";
export type SubscriptionTier = "free" | "plus" | "pro" | "enterprise";
export type PresenceStatus = "online" | "away" | "offline" | "invisible";
export type ThemePreference = "light" | "dark" | "system";
export type VerificationLevel = "none" | "email" | "phone" | "government_id";
export type KycStatus = "not_started" | "pending" | "verified" | "rejected";

export interface UserIdentity {
  verificationLevel?: VerificationLevel;
  kycStatus?: KycStatus;
}

export interface UserPreferences {
  theme: ThemePreference;
  language: string;
  timezone: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
}

export interface UserStats {
  followerCount: number;
  followingCount: number;
  postCount: number;
  reputationScore: number;
  joinRank?: number;
}

export interface UserSecurity {
  twoFactorEnabled: boolean;
  lastLoginAt?: string;
  lastLoginIp?: string;
  passwordUpdatedAt?: string;
}

export interface UserSubscription {
  tier: SubscriptionTier;
  renewsAt?: string;
  isTrial: boolean;
}

export interface LinkedAccount {
  provider: "google" | "github" | "apple" | "discord" | "x";
  providerId: string;
  linkedAt: string;
}

export interface FreshUser {
  id: string;
  username: string;
  email: string;
  fullName: string;

  avatar?: string;
  bannerImage?: string;
  bio?: string;
  location?: string;
  websiteUrl?: string;

  role: UserRole;
  verified: boolean;
  presence: PresenceStatus;

  identity: UserIdentity;
  preferences: UserPreferences;
  stats: UserStats;
  security: UserSecurity;
  subscription: UserSubscription;
  linkedAccounts: LinkedAccount[];

  createdAt: string;
  updatedAt: string;
}
