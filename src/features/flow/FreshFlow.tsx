import type { MediaContextDescriptor } from "../../core/media";
import { getFlowMediaDefinition, type FlowMediaKind } from "./media/flowMediaRegistry";

/**
 * Fresh Flow
 *
 * The universal media discovery surface. Media experiences are resolved from
 * one registry so Flow can expand from Shorts to long-form, Live, News,
 * Audio, Knowledge and immersive media without creating parallel feeds.
 *
 * Media context travels through the same boundary as the selected media
 * experience. Feature modules can adopt it incrementally without duplicating
 * provenance, evidence, lineage, accessibility, or temporal-state logic.
 */
export default function FreshFlow(props: {
  openComposerSignal?: number;
  onExit?: () => void;
  mediaKind?: FlowMediaKind;
  mediaContext?: MediaContextDescriptor;
}) {
  const mediaKind = props.mediaKind ?? "short";
  const definition = getFlowMediaDefinition(mediaKind);

  if (!definition.enabled) {
    throw new Error(`Fresh Flow media kind is not enabled: ${mediaKind}`);
  }

  const MediaComponent = definition.component;
  return (
    <MediaComponent
      openComposerSignal={props.openComposerSignal}
      onExit={props.onExit}
      mediaContext={props.mediaContext}
    />
  );
}
