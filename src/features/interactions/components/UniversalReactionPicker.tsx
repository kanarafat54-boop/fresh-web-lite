import { useState } from "react";
import {
  UNIVERSAL_REACTIONS,
  canReactToTarget,
  type UniversalInteractionTarget,
  type UniversalReactionKind,
} from "../../../core/interactions/FreshReactionModel";
import { interactionA11y, onActivation } from "../../../core/interactions/InteractionA11y";

const EMOJI: Record<UniversalReactionKind, string> = {
  like: "👍", love: "❤️", laugh: "😂", wow: "😮", celebrate: "🎉", support: "🤝",
  curious: "🤔", inspire: "✨", insightful: "💡", agree: "👍", disagree: "👎",
  helpful: "💙", question: "❓", respect: "🙏", fire: "🔥", sad: "😢", angry: "😡", custom: "➕",
};

export function UniversalReactionPicker({
  value,
  count = 0,
  onChange,
  label = "React",
  target,
}: {
  value?: UniversalReactionKind | null;
  count?: number;
  onChange: (reaction: UniversalReactionKind) => void;
  label?: string;
  target?: UniversalInteractionTarget;
}) {
  const [open, setOpen] = useState(false);
  const canReact = !target || canReactToTarget(target);
  const choose = (reaction: UniversalReactionKind) => { onChange(reaction); setOpen(false); };

  return (
    <div className="reaction-wrap" data-interaction-target={target?.type}>
      <button
        type="button"
        aria-label={canReact ? `${label}: ${value ?? "like"}, ${count} reactions` : `${label}: unavailable`}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={!canReact}
        className={value ? "like-btn liked" : "like-btn"}
        onClick={() => canReact && setOpen((v) => !v)}
        onKeyDown={(e) => canReact && onActivation(e, () => setOpen((v) => !v))}
      >
        <span aria-hidden="true">{EMOJI[value ?? "like"]}</span> {count}
      </button>
      {open && canReact && (
        <div className="reaction-popup" role="menu" aria-label={`Choose a reaction for ${target?.type ?? "content"}`}>
          {UNIVERSAL_REACTIONS.map((reaction) => (
            <button
              key={reaction}
              type="button"
              role="menuitem"
              aria-label={interactionA11y.reactionLabel(reaction, value === reaction)}
              aria-pressed={value === reaction}
              className="reaction-option"
              onClick={() => choose(reaction)}
              onKeyDown={(e) => onActivation(e, () => choose(reaction))}
            >
              <span aria-hidden="true">{EMOJI[reaction]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
