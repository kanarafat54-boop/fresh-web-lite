import type { ComponentType } from "react";
import type { MediaContextDescriptor } from "../../../core/media";
import { ShortsFlowExperience } from "./ShortsFlowExperience";

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

export interface FlowMediaComponentProps {
  openComposerSignal?: number;
  onExit?: () => void;
  mediaContext?: MediaContextDescriptor;
}

export interface FlowMediaDefinition {
  kind: FlowMediaKind;
  label: string;
  component: ComponentType<FlowMediaComponentProps>;
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
  { kind: "short", label: "Shorts", component: ShortsFlowExperience, enabled: true },
  { kind: "long_form", label: "Long-form", component: ShortsFlowExperience, enabled: false },
  { kind: "live", label: "Live", component: ShortsFlowExperience, enabled: false },
  { kind: "news", label: "News", component: ShortsFlowExperience, enabled: false },
  { kind: "audio", label: "Audio", component: ShortsFlowExperience, enabled: false },
  { kind: "image", label: "Images", component: ShortsFlowExperience, enabled: false },
  { kind: "gallery", label: "Galleries", component: ShortsFlowExperience, enabled: false },
  { kind: "knowledge", label: "Knowledge", component: ShortsFlowExperience, enabled: false },
  { kind: "immersive", label: "Immersive", component: ShortsFlowExperience, enabled: false },
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
