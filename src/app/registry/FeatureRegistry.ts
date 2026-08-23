import type { ReactElement, ComponentType } from "react";
import { AppConfig } from "../../config/app.config";

export type FeatureMeta = {
  id: string;
  name: string;
  route?: string;
  icon?: (props: { size?: number }) => ReactElement | null;
  permissions?: string[];
  searchable?: boolean;
  sdkVersion?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lazyLoader: () => Promise<{ default: ComponentType<any> }>;
};

const FEATURE_FLAG: Record<string, keyof typeof AppConfig.features | undefined> = {
  ai: "intelligence",
  wallet: "wallet",
  shorts: "shorts",
  saved: "saved",
  profile: "freshId",
  admin: "admin",
  creator: "creator",
  communication: "communication",
  learning: "learning",
  software: "software",
  studio: "studio",
  marketplace: "marketplace",
  crypto: "crypto",
};

class Registry {
  private features = new Map<string, FeatureMeta>();
  register(feature: FeatureMeta): void {
    const flag = FEATURE_FLAG[feature.id];
    if (flag && !AppConfig.features[flag]) return;
    if (this.features.has(feature.id)) console.warn(`FeatureRegistry: overriding feature ${feature.id}`);
    this.features.set(feature.id, feature);
  }
  getFeature(id?: string): FeatureMeta | undefined { return id ? this.features.get(id) : undefined; }
  getNavEntries(): FeatureMeta[] { return Array.from(this.features.values()).filter((f) => !!f.route); }
  getAll(): FeatureMeta[] { return Array.from(this.features.values()); }
}

export const FeatureRegistry = new Registry();
export default FeatureRegistry;

FeatureRegistry.register({ id: "first-experience", name: "Fresh First Experience", searchable: false, lazyLoader: () => import("../../features/fresh-first-experience/FreshFirstExperience").then((m) => ({ default: m.default })) });
FeatureRegistry.register({ id: "feed", name: "Home", route: "/", searchable: true, lazyLoader: () => import("../../features/home/HomeDashboard").then((m) => ({ default: m.default })) });
FeatureRegistry.register({ id: "ai", name: "Fresh AI", route: "/ai", searchable: false, lazyLoader: () => import("../../features/ai/components/FreshAIHome").then((m) => ({ default: m.FreshAIHome })) });
FeatureRegistry.register({ id: "wallet", name: "Fresh Wallet", route: "/wallet", searchable: true, permissions: ["wallet:read"], lazyLoader: () => import("../../features/wallet/WalletDashboard").then((m) => ({ default: m.WalletDashboard })) });
FeatureRegistry.register({ id: "shorts", name: "Shorts", route: "/shorts", searchable: false, lazyLoader: () => import("../../features/shorts/components/ShortsModule").then((m) => ({ default: m.ShortsModule })) });
FeatureRegistry.register({ id: "saved", name: "Saved", route: "/saved", searchable: false, lazyLoader: () => import("../../features/saved/components/SavedModule").then((m) => ({ default: m.SavedModule })) });
FeatureRegistry.register({ id: "creator", name: "Creator Studio", route: "/creator", searchable: true, lazyLoader: () => import("../../features/profile/components/ecosystems/EcosystemLauncher").then((m) => ({ default: m.default })) });
FeatureRegistry.register({ id: "profile", name: "Profile", route: "/profile", searchable: false, lazyLoader: () => import("../../features/profile/components/ProfileRoute").then((m) => ({ default: m.default })) });
FeatureRegistry.register({ id: "admin", name: "Admin", route: "/admin", searchable: false, lazyLoader: () => import("../../features/admin/AdminPanel").then((m) => ({ default: m.AdminPanel })) });
FeatureRegistry.register({ id: "communication", name: "Connect", route: "/connect", searchable: true, lazyLoader: () => import("../../features/workspaces/CommunicationWorkspace").then((m) => ({ default: m.default })) });
FeatureRegistry.register({ id: "learning", name: "Academy", route: "/learn", searchable: true, lazyLoader: () => import("../../features/workspaces/LearningWorkspace").then((m) => ({ default: m.default })) });
FeatureRegistry.register({ id: "software", name: "Software Studio", route: "/software", searchable: true, lazyLoader: () => import("../../features/workspaces/SoftwareWorkspace").then((m) => ({ default: m.default })) });
FeatureRegistry.register({ id: "studio", name: "Studio", route: "/studio", searchable: true, lazyLoader: () => import("../../features/workspaces/StudioWorkspace").then((m) => ({ default: m.default })) });
FeatureRegistry.register({ id: "marketplace", name: "Marketplace", route: "/marketplace", searchable: true, lazyLoader: () => import("../../features/workspaces/MarketplaceWorkspace").then((m) => ({ default: m.default })) });
FeatureRegistry.register({ id: "crypto", name: "Crypto", route: "/crypto", searchable: true, lazyLoader: () => import("../../features/workspaces/CryptoWorkspace").then((m) => ({ default: m.default })) });
FeatureRegistry.register({ id: "truemode", name: "TrueMode", route: "/true-mode", searchable: true, lazyLoader: () => import("../../features/truemode/TrueModeHub").then((m) => ({ default: m.default })) });
