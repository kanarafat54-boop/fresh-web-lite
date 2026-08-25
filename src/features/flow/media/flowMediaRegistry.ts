import type { ComponentType } from "react";
import {
  FRESH_FLOW_MEDIA_REGISTRY,
  type FreshFlowMediaDefinition,
} from "../../../core/media/FreshFlowRegistry";
import type { MediaKind } from "../../../core/media/freshFlow";
import { ShortsModule } from "../../shorts/components/ShortsModule";

/**
 * UI adapter between the Fresh Media OS registry and feature components.
 *
 * The Media OS owns the canonical media taxonomy, capabilities, surfaces and
 * lifecycle status. This layer only resolves an enabled media kind to its
 * concrete UI implementation. It must never maintain a second taxonomy.
 */
export type FlowMediaKind = MediaKind;

export interface FlowMediaDefinition {
  kind: FlowMediaKind;
  label: string;
  component: ComponentType<any>;
  enabled: boolean;
  capabilities: readonly string[];
  realtime: boolean;
}

const FLOW_COMPONENTS: Partial<Record<MediaKind, ComponentType<any>>> = {
  short: ShortsModule,
};

function toFlowDefinition(definition: FreshFlowMediaDefinition): FlowMediaDefinition {
  return {
    kind: definition.kind,
    label: definition.label,
    component: FLOW_COMPONENTS[definition.kind] ?? ShortsModule,
    enabled: definition.status === "active" && Boolean(FLOW_COMPONENTS[definition.kind]),
    capabilities: definition.capabilities,
    realtime: definition.realtime,
  };
}

export const FLOW_MEDIA_REGISTRY: readonly FlowMediaDefinition[] =
  FRESH_FLOW_MEDIA_REGISTRY.map(toFlowDefinition);

export function getFlowMediaDefinition(kind: FlowMediaKind): FlowMediaDefinition {
  const definition = FLOW_MEDIA_REGISTRY.find((item) => item.kind === kind);

  if (!definition) {
    throw new Error(`Unsupported Fresh Flow media kind: ${kind}`);
  }

  return definition;
}

export function getEnabledFlowMedia(): readonly FlowMediaDefinition[] {
  return FLOW_MEDIA_REGISTRY.filter((item) => item.enabled);
}
