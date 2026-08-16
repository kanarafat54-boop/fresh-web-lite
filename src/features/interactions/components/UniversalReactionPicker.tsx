import { useState } from "react";
import { UNIVERSAL_REACTIONS, type UniversalReactionKind } from "../../../core/interactions/FreshReactionModel";
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
}: {
  value?: UniversalReactionKind | null;
  count?: number;
  onChange: (reaction: UniversalReactionKind) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const choose = (reaction: UniversalReactionKind) => { onChange(reaction); setOpen(false); };
  return (
    <div className="reaction-wrap">
      <button
        type="button"
        aria-label={`${label}: ${value ?? "like"}, ${count} reactions`}
        aria-haspopup="menu"
        aria-expanded={open}
        className={value ? "like-btn liked" : "like-btn"}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => onActivation(e, () => setOpen((v) => !v))}
      >
        <span aria-hidden="true">{EMOJI[value ?? "like"]}</span> {count}
      </button>
      {open && (
        <div className="reaction-popup" role="menu" aria-label="Choose a reaction">
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
