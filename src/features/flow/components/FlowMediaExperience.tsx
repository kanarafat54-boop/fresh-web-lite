import type { ComponentType } from "react";
import type { FlowMediaDefinition } from "../media/flowMediaRegistry";

export interface FlowMediaExperienceProps {
  definition: FlowMediaDefinition;
  openComposerSignal?: number;
  onExit?: () => void;
}

/**
 * Stable boundary between Fresh Flow's universal media context and a concrete
 * media experience. The concrete experience keeps its own domain contract;
 * Flow supplies the canonical media metadata at the boundary.
 */
export function FlowMediaExperience({
  definition,
  openComposerSignal,
  onExit,
}: FlowMediaExperienceProps) {
  const MediaComponent = definition.component;

  return (
    <section
      data-fresh-flow-media={definition.kind}
      data-fresh-flow-realtime={definition.realtime ? "true" : "false"}
      data-fresh-flow-capabilities={definition.capabilities.join(",")}
      aria-label={`${definition.label} media experience`}
    >
      <MediaComponent openComposerSignal={openComposerSignal} onExit={onExit} />
    </section>
  );
}
