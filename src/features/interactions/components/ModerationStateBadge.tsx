import type { InteractionModeration } from "../../../core/interactions/moderation";
import { moderationLabel } from "../../../core/interactions/moderation";

export function ModerationStateBadge({ moderation }: { moderation?: InteractionModeration }) {
  if (!moderation || moderation.state === "visible" || moderation.state === "approved") return null;
  return <span className={`moderation-state moderation-${moderation.state}`} role="status" aria-live="polite">
    {moderationLabel(moderation.state)}{moderation.reason ? ` — ${moderation.reason}` : ""}
  </span>;
}
