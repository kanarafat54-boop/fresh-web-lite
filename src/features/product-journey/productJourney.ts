/**
 * Fresh Web Lite — Product Journey Canon
 * Matches the locked mockup: Welcome → Sign In/Up → Onboarding → Main Home → Fresh Flow → Fresh AI → Full Home
 */

export const JOURNEY_STEPS = [
  { id: "welcome", label: "Welcome Page", route: "welcome", description: "A beautiful first impression." },
  { id: "auth", label: "Sign In / Sign Up", route: "auth-signin", description: "Access your world." },
  { id: "onboarding", label: "Onboarding", route: "onboarding", description: "Personalize your experience." },
  { id: "home", label: "Main Home", route: "feed", description: "Your central hub after login." },
  { id: "flow", label: "Enter Fresh Flow", route: "fresh-flow", description: "Shorts, Long Videos, News, More." },
  { id: "flow-ai", label: "Fresh Flow + Fresh AI", route: "fresh-flow", description: "AI-powered intelligence for every short." },
  { id: "full-home", label: "Full Home", route: "feed", description: "All ecosystems. All in one place." },
] as const;

export const ONBOARDING_INTERESTS = [
  { id: "ai-tech", label: "AI & Tech" },
  { id: "education", label: "Education" },
  { id: "business", label: "Business" },
  { id: "entertainment", label: "Entertainment" },
  { id: "sports", label: "Sports" },
  { id: "finance", label: "Finance" },
  { id: "gaming", label: "Gaming" },
  { id: "health", label: "Health" },
  { id: "travel", label: "Travel" },
  { id: "other", label: "Other" },
] as const;

/** 32-ecosystem surface map — Home grid (mockup panels 4 & 7). */
export const HOME_ECOSYSTEMS = [
  { id: "ai", label: "Fresh AI", route: "ai", tone: "purple" },
  { id: "flow", label: "Fresh Flow", route: "fresh-flow", tone: "blue" },
  { id: "ecosystems", label: "Ecosystems", route: "discovery", tone: "cyan" },
  { id: "wallet", label: "Wallet", route: "wallet", tone: "green" },
  { id: "design", label: "Design", route: "studio", tone: "pink" },
  { id: "learning", label: "Learning", route: "learning", tone: "teal" },
  { id: "work", label: "Work", route: "work", tone: "indigo" },
  { id: "communication", label: "Communication", route: "communication", tone: "sky" },
  { id: "creation", label: "Creation", route: "creator", tone: "violet" },
  { id: "discovery", label: "Discovery", route: "discovery", tone: "amber" },
  { id: "trade", label: "Trade", route: "marketplace", tone: "orange" },
  { id: "financial", label: "Financial", route: "wallet", tone: "emerald" },
  { id: "crypto", label: "Crypto", route: "crypto", tone: "yellow" },
] as const;

export const FRESH_AI_CONTEXT_ACTIONS = [
  { id: "instant", label: "Instant Knowledge", description: "Understand what you're watching (Explain, context, key points)" },
  { id: "sources", label: "Context & Sources", description: "Explore verified facts and references" },
  { id: "digest", label: "Fresh AI Digest", description: "Get a concise summary" },
  { id: "shop", label: "Shop / Support Creator", description: "Find related products or support the creator" },
  { id: "provenance", label: "Collectible & Provenance", description: "Explore ownership and history" },
] as const;

export const FLOW_MORE_ACTIONS = [
  { id: "comments", label: "Comments", description: "Discuss & share" },
  { id: "audio", label: "Audio", description: "Listen and add sound" },
  { id: "replies", label: "Replies", description: "Join the conversation" },
  { id: "reactions", label: "Reactions", description: "Like, love, wow" },
  { id: "duets", label: "Duets", description: "Create together" },
  { id: "remix", label: "Remix", description: "Build on content" },
  { id: "collab", label: "Collaboration", description: "Work with creators" },
  { id: "effects", label: "Captions & Effects", description: "Make it yours" },
  { id: "voice", label: "Voice Search", description: "Find by voice" },
  { id: "translate", label: "Text/Voice Translate", description: "Break language barriers" },
  { id: "3d", label: "3-Dots Engine", description: "More options" },
  { id: "follow", label: "Follow", description: "Stay connected" },
] as const;

const KEYS = {
  welcomeSeen: "fresh.journey.welcomeSeen",
  onboardingDone: "fresh.journey.onboardingDone",
  interests: "fresh.journey.interests",
  firstCompleted: "fresh.firstExperience.completed",
};

export function hasSeenWelcome(): boolean {
  try {
    return localStorage.getItem(KEYS.welcomeSeen) === "true";
  } catch {
    return false;
  }
}

export function markWelcomeSeen() {
  try {
    localStorage.setItem(KEYS.welcomeSeen, "true");
  } catch {
    /* ignore */
  }
}

export function isOnboardingDone(): boolean {
  try {
    return localStorage.getItem(KEYS.onboardingDone) === "true";
  } catch {
    return false;
  }
}

export function completeOnboarding(interestIds: string[]) {
  try {
    localStorage.setItem(KEYS.onboardingDone, "true");
    localStorage.setItem(KEYS.interests, JSON.stringify(interestIds));
    localStorage.setItem(KEYS.firstCompleted, "true");
  } catch {
    /* ignore */
  }
}

export function loadOnboardingInterests(): string[] {
  try {
    const raw = localStorage.getItem(KEYS.interests);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Resolve entry route for cold start. */
export function resolveEntryRoute(isAuthenticated: boolean): string {
  if (!isAuthenticated) return hasSeenWelcome() ? "auth-signin" : "welcome";
  if (!isOnboardingDone()) return "onboarding";
  return "feed";
}
