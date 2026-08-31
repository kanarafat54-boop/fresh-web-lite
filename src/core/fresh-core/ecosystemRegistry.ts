export interface Ecosystem {
  id: string;
  name: string;
  category: string;
  description: string;
  enabled: boolean;
}

export const ecosystems: Ecosystem[] = [
  { id: "social", name: "Social", category: "communication", description: "Feed, communities, groups and content", enabled: true },
  { id: "ai", name: "Fresh AI", category: "intelligence", description: "Personal AI and assistants", enabled: true },
  { id: "creator", name: "Creator Economy", category: "creation", description: "Creation and monetization tools", enabled: true },
  { id: "finance", name: "Fresh Finance", category: "money", description: "Wallet payments and economy", enabled: true },
  { id: "learning", name: "Fresh Academy", category: "education", description: "Learning and knowledge", enabled: true },
  { id: "developer", name: "Developer Studio", category: "software", description: "Build applications with Ara6", enabled: true },

  { id: "live", name: "Fresh Live", category: "media", description: "Live streaming, Go Live Earn, gifts, and creator monetization", enabled: false },
  { id: "stories", name: "Fresh Stories", category: "media", description: "Temporary visual/audio stories", enabled: false },
  { id: "groups", name: "Fresh Groups", category: "communication", description: "Private and public group communication", enabled: false },
  { id: "communities", name: "Fresh Communities", category: "communication", description: "Large-scale interest/professional communities", enabled: false },
  { id: "calls", name: "Fresh Calls", category: "communication", description: "Voice, video, and real-time communication", enabled: false },
  { id: "treasure", name: "Fresh Treasure", category: "money", description: "Savings, rewards, wealth, and premium financial ecosystem", enabled: false },
  { id: "ads-campaigns", name: "Fresh Ads & Campaigns", category: "commerce", description: "Advertising and campaign management", enabled: false },
  { id: "work", name: "Fresh Work", category: "productivity", description: "Professional workspace, projects, and productivity", enabled: false },
  { id: "automation", name: "Fresh Automation", category: "intelligence", description: "Autonomous workflows, agents, and scheduled actions", enabled: false },
  { id: "trust", name: "Fresh Trust", category: "trust-safety", description: "Reputation, verification, safety, and trust infrastructure", enabled: false },
  { id: "vr-ar", name: "Fresh VR/AR", category: "media", description: "Immersive virtual and augmented-reality interaction", enabled: false },
  { id: "language", name: "Fresh Language", category: "platform", description: "Translation, voice translation, multilingual communication, and accessibility", enabled: false },
  { id: "api-hub", name: "Fresh API Hub", category: "software", description: "Integrations, external services, developer connectivity, and platform APIs", enabled: false },
  { id: "organizations", name: "Fresh Organizations", category: "organizations", description: "Businesses, teams, institutions, and organization workspaces", enabled: false },
  { id: "sports", name: "Fresh Sports", category: "media", description: "Gaming and gambling", enabled: false },
];
