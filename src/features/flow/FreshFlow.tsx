import { getFlowMediaDefinition, type FlowMediaKind } from "./media/flowMediaRegistry";

/**
 * Fresh Flow
 *
 * The universal media discovery surface. Media experiences are resolved from
 * one registry so Flow can expand from Shorts to long-form, Live, News,
 * Audio, Knowledge and immersive media without creating parallel feeds.
 */
export default function FreshFlow(props: {
  openComposerSignal?: number;
  onExit?: () => void;
  mediaKind?: FlowMediaKind;
}) {
  const mediaKind = props.mediaKind ?? "short";
  const definition = getFlowMediaDefinition(mediaKind);

  if (!definition.enabled) {
    throw new Error(`Fresh Flow media kind is not enabled: ${mediaKind}`);
  }

  const MediaComponent = definition.component;
  return <MediaComponent openComposerSignal={props.openComposerSignal} onExit={props.onExit} />;
}
