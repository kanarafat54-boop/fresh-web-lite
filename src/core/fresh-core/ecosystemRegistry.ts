import {
  FRESH_MAJOR_ECOSYSTEMS,
  type MajorEcosystem,
  type EcosystemLifecycle,
} from "../platform/freshEcosystemCatalog";

export type Ecosystem = MajorEcosystem & {
  /**
   * Backwards-compatible field used by older Fresh Core consumers.
   * Enabled means the ecosystem is part of the canonical platform graph;
   * lifecycle remains the source of implementation truth.
   */
  enabled: boolean;
};

export const ecosystems: Ecosystem[] = FRESH_MAJOR_ECOSYSTEMS.map((ecosystem) => ({
  ...ecosystem,
  enabled: ecosystem.lifecycle !== "blocked",
}));

export function getEcosystem(id: string): Ecosystem | undefined {
  return ecosystems.find((ecosystem) => ecosystem.id === id);
}

export function getEcosystemsByLifecycle(lifecycle: EcosystemLifecycle): Ecosystem[] {
  return ecosystems.filter((ecosystem) => ecosystem.lifecycle === lifecycle);
}
