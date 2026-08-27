import { useSyncExternalStore } from "react";
import { featurePreferencesStore } from "./featurePreferencesStore";

export function useFeaturePreferences() {
  useSyncExternalStore(
    (listener) => featurePreferencesStore.subscribe(listener),
    () => featurePreferencesStore.getSnapshot(),
  );

  return {
    navEntries: featurePreferencesStore.getOrderedNavEntries(),
    allEntries: featurePreferencesStore.getAllWithState(),
    toggle: (id: string) => featurePreferencesStore.toggle(id),
    move: (id: string, direction: -1 | 1) => featurePreferencesStore.move(id, direction),
    resetToDefault: () => featurePreferencesStore.resetToDefault(),
  };
}
