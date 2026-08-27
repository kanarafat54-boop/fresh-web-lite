import { FeatureRegistry } from "./FeatureRegistry";

const STORAGE_KEY = "fresh.featurePreferences.v1";
const LOCKED_IDS = new Set(["feed"]); // always visible, cannot be hidden

type PreferencesShape = { order: string[]; enabled: string[] };
type Listener = () => void;

function readStorage(): PreferencesShape | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.order) || !Array.isArray(parsed.enabled)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStorage(prefs: PreferencesShape): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Storage can be unavailable in privacy-restricted browsers; fail silently.
  }
}

function defaultPreferences(): PreferencesShape {
  const ids = FeatureRegistry.getNavEntries().map((f) => f.id);
  return { order: ids, enabled: ids };
}

function reconcile(stored: PreferencesShape): PreferencesShape {
  const knownIds = FeatureRegistry.getNavEntries().map((f) => f.id);
  const knownSet = new Set(knownIds);
  const order = stored.order.filter((id) => knownSet.has(id));
  for (const id of knownIds) if (!order.includes(id)) order.push(id);
  const enabled = stored.enabled.filter((id) => knownSet.has(id));
  for (const id of LOCKED_IDS) if (knownSet.has(id) && !enabled.includes(id)) enabled.push(id);
  return { order, enabled };
}

class FeaturePreferencesStore {
  private prefs: PreferencesShape;
  private listeners = new Set<Listener>();

  constructor() {
    const stored = readStorage();
    this.prefs = reconcile(stored ?? defaultPreferences());
  }

  private commit(next: PreferencesShape): void {
    this.prefs = next;
    writeStorage(next);
    this.listeners.forEach((listener) => listener());
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): PreferencesShape {
    return this.prefs;
  }

  toggle(id: string): void {
    if (LOCKED_IDS.has(id)) return;
    const enabled = this.prefs.enabled.includes(id)
      ? this.prefs.enabled.filter((existing) => existing !== id)
      : [...this.prefs.enabled, id];
    this.commit({ ...this.prefs, enabled });
  }

  move(id: string, direction: -1 | 1): void {
    const order = [...this.prefs.order];
    const index = order.indexOf(id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= order.length) return;
    [order[index], order[target]] = [order[target], order[index]];
    this.commit({ ...this.prefs, order });
  }

  resetToDefault(): void {
    this.commit(defaultPreferences());
  }

  getOrderedNavEntries() {
    return this.prefs.order
      .filter((id) => this.prefs.enabled.includes(id))
      .map((id) => FeatureRegistry.getFeature(id))
      .filter((feature): feature is NonNullable<typeof feature> => !!feature);
  }

  getAllWithState() {
    return this.prefs.order
      .map((id) => ({
        feature: FeatureRegistry.getFeature(id),
        enabled: this.prefs.enabled.includes(id),
        locked: LOCKED_IDS.has(id),
      }))
      .filter((entry): entry is { feature: NonNullable<typeof entry.feature>; enabled: boolean; locked: boolean } => !!entry.feature);
  }
}

export const featurePreferencesStore = new FeaturePreferencesStore();
