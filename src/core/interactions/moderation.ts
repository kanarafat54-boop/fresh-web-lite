export type ModerationState = "visible" | "pending" | "approved" | "limited" | "hidden" | "removed" | "appealed" | "blocked";

export type InteractionModeration = {
  state: ModerationState;
  reason?: string;
  reviewedAt?: string;
  reviewerId?: string;
  appealAvailable?: boolean;
};

export function canRenderInteraction(moderation?: InteractionModeration): boolean {
  if (!moderation) return true;
  return !["removed", "blocked"].includes(moderation.state);
}

export function moderationLabel(state: ModerationState): string {
  const labels: Record<ModerationState, string> = {
    visible: "Visible", pending: "Under review", approved: "Approved", limited: "Limited visibility",
    hidden: "Hidden", removed: "Removed", appealed: "Appeal in progress", blocked: "Blocked",
  };
  return labels[state];
}
