import { ShortsModule } from "../../shorts/components/ShortsModule";
import type { MediaContextDescriptor } from "../../../core/media/MediaContextLayer";

export interface FlowMediaExperienceProps {
  openComposerSignal?: number;
  onExit?: () => void;
  mediaContext?: MediaContextDescriptor;
}

/**
 * Adapter boundary between Fresh Flow's universal media contract and the
 * existing Shorts implementation. The Shorts engine remains the source of
 * truth; context is accepted here so it can be progressively consumed without
 * forcing a rewrite of the established feed.
 */
export function ShortsFlowExperience({
  openComposerSignal,
  onExit,
  mediaContext,
}: FlowMediaExperienceProps) {
  void mediaContext;
  return (
    <ShortsModule
      openComposerSignal={openComposerSignal}
      onExit={onExit}
    />
  );
}
