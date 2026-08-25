import type { FreshFlowMediaReference } from "../../../core/media/freshFlow";
import type { Short } from "../../shorts/types/short";

/**
 * Projects the existing Shorts domain object into the canonical Fresh Flow
 * media reference without changing the Shorts data contract.
 *
 * ShortsModule remains the owner of persistence and feature-specific state;
 * Flow receives a stable cross-media identity that can later carry sources,
 * lineage, accessibility and knowledge relationships.
 */
export function toFreshFlowShortReference(short: Short): FreshFlowMediaReference {
  return {
    mediaId: short.id,
    kind: "short",
    creatorId: short.authorId,
    realtime: false,
  };
}

export function toFreshFlowShortReferences(
  shorts: readonly Short[],
): FreshFlowMediaReference[] {
  return shorts.map(toFreshFlowShortReference);
}
