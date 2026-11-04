import type { ReactElement, ComponentType } from "react";

export type FeatureMeta = {
  id: string;
  name: string;
  route?: string;
  icon?: (props: { size?: number }) => ReactElement;
  searchable?: boolean;
  permissions?: string[];
  lazyLoader: () => Promise<{ default: ComponentType<any> }>;
};

class Registry {
  private features = new Map<string, FeatureMeta>();

  register(meta: FeatureMeta) {
    this.features.set(meta.id, meta);
  }

  getFeature(id?: string | null) {
    if (!id) return undefined;
    return this.features.get(id);
  }

  getAll() {
    return Array.from(this.features.values());
  }

  getNavEntries() {
    return this.getAll().filter((f) => f.route && f.searchable !== false);
  }
}

export const FeatureRegistry = new Registry();
export default FeatureRegistry;

const loadAuth = () => import("../../features/fresh-id/components/AuthRoute").then((m) => ({ default: m.default }));

FeatureRegistry.register({ id: "welcome", name: "Welcome", route: "/welcome", searchable: false, lazyLoader: () => import("../../features/product-journey/WelcomeRoute").then((m) => ({ default: m.default })) });
FeatureRegistry.register({ id: "onboarding", name: "Onboarding", route: "/onboarding", searchable: false, lazyLoader: () => import("../../features/product-journey/OnboardingRoute").then((m) => ({ default: m.default })) });
FeatureRegistry.register({ id: "auth-signin", name: "Fresh ID Sign In", route: "/auth/sign-in", searchable: false, lazyLoader: loadAuth });
FeatureRegistry.register({ id: "auth-signup", name: "Fresh ID Sign Up", route: "/auth/sign-up", searchable: false, lazyLoader: loadAuth });
FeatureRegistry.register({ id: "first-experience", name: "Fresh First Experience", searchable: false, lazyLoader: () => import("../../features/fresh-first-experience/FreshFirstExperience").then((m) => ({ default: m.default })) });
FeatureRegistry.register({ id: "feed", name: "Home", route: "/", searchable: true, lazyLoader: () => import("../../features/home/HomeDashboard").then((m) => ({ default: m.default })) });
FeatureRegistry.register({ id: "ai", name: "Fresh AI", route: "/ai", searchable: true, lazyLoader: () => import("../components/FreshAIUnified").then((m) => ({ default: m.default })) });
FeatureRegistry.register({ id: "wallet", name: "Wallet", route: "/wallet", searchable: true, permissions: ["wallet:read"], lazyLoader: () => import("../../features/wallet/WalletDashboard").then((m) => ({ default: m.default })) });
FeatureRegistry.register({ id: "studio", name: "Create", route: "/studio", searchable: true, lazyLoader: () => import("../../features/workspaces/StudioWorkspace").then((m) => ({ default: m.default })) });
FeatureRegistry.register({ id: "profile", name: "Profile", route: "/profile", searchable: true, lazyLoader: () => import("../../features/profile/components/SmartProfilePage").then((m) => ({ default: m.default })) });
FeatureRegistry.register({ id: "discovery", name: "Discover", route: "/discovery", searchable: true, lazyLoader: () => import("../../features/workspaces/DiscoveryWorkspace").then((m) => ({ default: m.default })) });
FeatureRegistry.register({ id: "work", name: "Work", route: "/work", searchable: true, lazyLoader: () => import("../../features/workspaces/WorkWorkspace").then((m) => ({ default: m.default })) });
FeatureRegistry.register({ id: "learning", name: "Academy", route: "/learning", searchable: true, lazyLoader: () => import("../../features/workspaces/LearningWorkspace").then((m) => ({ default: m.default })) });
FeatureRegistry.register({ id: "communication", name: "Connect", route: "/communication", searchable: true, lazyLoader: () => import("../../features/workspaces/CommunicationWorkspace").then((m) => ({ default: m.default })) });
FeatureRegistry.register({ id: "fresh-mail", name: "Fresh Mail", route: "/fresh-mail", searchable: true, lazyLoader: () => import("../../features/workspaces/FreshMailWorkspace").then((m) => ({ default: m.default })) });
FeatureRegistry.register({ id: "creator", name: "Creator dashboard", route: "/creation", searchable: true, lazyLoader: () => import("../../features/creator/CreatorStudioDashboard").then((m) => ({ default: m.default })) });
FeatureRegistry.register({ id: "marketplace", name: "Marketplace", route: "/marketplace", searchable: true, lazyLoader: () => import("../../features/workspaces/MarketplaceWorkspace").then((m) => ({ default: m.default })) });
FeatureRegistry.register({ id: "crypto", name: "Crypto", route: "/crypto", searchable: true, lazyLoader: () => import("../../features/wallet/WalletDashboard").then((m) => ({ default: m.default })) });
FeatureRegistry.register({ id: "saved", name: "Saved", route: "/saved", searchable: true, lazyLoader: () => import("../../features/saved/components/SavedModule").then((m) => ({ default: m.default })) });
FeatureRegistry.register({ id: "fresh-flow", name: "Flow", route: "/fresh-flow", searchable: true, lazyLoader: () => import("../../features/fresh-flow/FreshFlowHub").then((m) => ({ default: m.default })) });
FeatureRegistry.register({ id: "settings", name: "Settings", route: "/settings", searchable: true, lazyLoader: () => import("../../features/workspaces/SettingsWorkspace").then((m) => ({ default: m.default })) });
