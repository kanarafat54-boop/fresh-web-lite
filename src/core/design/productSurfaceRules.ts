export const FRESH_SURFACE_RULES = [
  "Public surfaces lead with Fresh Web Lite, never the founder.",
  "Personal identity belongs in Fresh ID, Profile and Personal Space.",
  "One canonical interaction pattern should serve many ecosystems.",
  "Expose the smallest useful interface for the current intent.",
  "Advanced capability stays discoverable without overwhelming the default surface.",
  "User outcomes stay visible; implementation details and secrets stay behind the product boundary.",
] as const;

export const FRESH_STARTUP_PRINCIPLES = {
  title: "Fresh Web Lite",
  prompt: "What can I help you do?",
  alternatePrompt: "Tell Fresh",
  actions: ["Explore", "Create", "Learn", "Work", "Connect", "Discover"] as const,
} as const;
