import { FeatureRegistry } from "../registry/FeatureRegistry";

const FIRST_EXPERIENCE_ID = "first-experience";
const DEFAULT_ROUTE = "feed";

function normalizePath(pathname: string): string {
  const path = pathname.replace(/^\/+|\/+$/g, "");
  return path ? `/${path}` : "/";
}

export function routeToPath(routeId: string): string {
  if (routeId === FIRST_EXPERIENCE_ID) return "/";
  const feature = FeatureRegistry.getFeature(routeId);
  return feature?.route ?? "/";
}

export function pathToRoute(pathname: string): string | undefined {
  const path = normalizePath(pathname);
  if (path === "/") return undefined;
  return FeatureRegistry.getNavEntries().find((feature) => normalizePath(feature.route ?? "/") === path)?.id;
}

export function getInitialRoute(): string {
  return pathToRoute(window.location.pathname) ?? DEFAULT_ROUTE;
}

export function navigateToRoute(routeId: string, replace = false): void {
  const path = routeToPath(routeId);
  const method = replace ? "replaceState" : "pushState";
  if (window.location.pathname !== path) {
    window.history[method]({ freshRoute: routeId }, "", path);
  }
}

export function subscribeToBrowserNavigation(onRoute: (routeId: string) => void): () => void {
  const handlePopState = () => {
    const route = pathToRoute(window.location.pathname);
    if (route) onRoute(route);
  };
  window.addEventListener("popstate", handlePopState);
  return () => window.removeEventListener("popstate", handlePopState);
}
