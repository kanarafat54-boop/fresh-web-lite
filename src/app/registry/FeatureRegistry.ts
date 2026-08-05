import type { ReactElement } from "react";

export type FeatureMeta = {
  id: string;
  name: string;
  route?: string;
  icon?: (props: { size?: number }) => ReactElement | null;
  permissions?: string[];
  searchable?: boolean;
  sdkVersion?: string;
  lazyLoader: () => Promise<{ default: React.ComponentType<any> }>;
};

class Registry {
  private features = new Map<string, FeatureMeta>();

  register(feature: FeatureMeta): void {
    if (this.features.has(feature.id)) {
      // override allowed during development
      // eslint-disable-next-line no-console
      console.warn(`FeatureRegistry: overriding feature ${feature.id}`);
    }
    this.features.set(feature.id, feature);
  }

  getFeature(id?: string): FeatureMeta | undefined {
    if (!id) return undefined;
    return this.features.get(id);
  }

  getNavEntries(): FeatureMeta[] {
    return Array.from(this.features.values()).filter((f) => !!f.route);
  }

  getAll(): FeatureMeta[] {
    return Array.from(this.features.values());
  }
}

export const FeatureRegistry = new Registry();
export default FeatureRegistry;

// Register core features lazily here so the registry is populated at app startup.
// Each lazyLoader uses dynamic import so features are code-split.

FeatureRegistry.register({
  id: "feed",
  name: "Home",
  route: "/",
  searchable: true,
  lazyLoader: () => import("../../features/home/HomeDashboard").then((m) => ({ default: m.default })),
});

FeatureRegistry.register({
  id: "ai",
  name: "Fresh AI",
  route: "/ai",
  searchable: false,
  lazyLoader: () => import("../../features/ai/components/FreshAIHome").then((m) => ({ default: m.default })),
});

FeatureRegistry.register({
  id: "shorts",
  name: "Shorts",
  route: "/shorts",
  searchable: false,
  lazyLoader: () => import("../../features/shorts/components/ShortsModule").then((m) => ({ default: m.default })),
});

FeatureRegistry.register({
  id: "saved",
  name: "Saved",
  route: "/saved",
  searchable: false,
  lazyLoader: () => import("../../features/saved/components/SavedModule").then((m) => ({ default: m.default })),
});

FeatureRegistry.register({
  id: "profile",
  name: "Profile",
  route: "/profile",
  searchable: false,
  lazyLoader: () => import("../../features/profile/components/ProfileView").then((m) => ({ default: m.default || m.ProfileView })),
});

FeatureRegistry.register({
  id: "admin",
  name: "Admin",
  route: "/admin",
  searchable: false,
  lazyLoader: () => import("../../features/admin/AdminPanel").then((m) => ({ default: m.AdminPanel || m.default })),
});
