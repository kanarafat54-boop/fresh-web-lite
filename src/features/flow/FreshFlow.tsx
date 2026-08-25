import { getFlowMediaDefinition, type FlowMediaKind } from "./media/flowMediaRegistry";
import { FlowMediaExperience } from "./components/FlowMediaExperience";

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

  return (
    <FlowMediaExperience
      definition={definition}
      openComposerSignal={props.openComposerSignal}
      onExit={props.onExit}
    />
  );
}
