import type { ComponentType } from "react";
import { ShortsModule } from "../../shorts/components/ShortsModule";

export type FlowMediaKind =
  | "short"
  | "long_form"
  | "live"
  | "news"
  | "audio"
  | "image"
  | "gallery"
  | "knowledge"
  | "immersive";

export interface FlowMediaDefinition {
  kind: FlowMediaKind;
  label: string;
  component: ComponentType<any>;
  enabled: boolean;
}

/**
 * Single registry for media experiences rendered by Fresh Flow.
 *
 * New media kinds must enter through this registry rather than creating a
 * second discovery surface. Unsupported kinds remain declared but disabled
 * until their production implementation exists.
 */
export const FLOW_MEDIA_REGISTRY: readonly FlowMediaDefinition[] = [
  { kind: "short", label: "Shorts", component: ShortsModule, enabled: true },
  { kind: "long_form", label: "Long-form", component: ShortsModule, enabled: false },
  { kind: "live", label: "Live", component: ShortsModule, enabled: false },
  { kind: "news", label: "News", component: ShortsModule, enabled: false },
  { kind: "audio", label: "Audio", component: ShortsModule, enabled: false },
  { kind: "image", label: "Images", component: ShortsModule, enabled: false },
  { kind: "gallery", label: "Galleries", component: ShortsModule, enabled: false },
  { kind: "knowledge", label: "Knowledge", component: ShortsModule, enabled: false },
  { kind: "immersive", label: "Immersive", component: ShortsModule, enabled: false },
];

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
