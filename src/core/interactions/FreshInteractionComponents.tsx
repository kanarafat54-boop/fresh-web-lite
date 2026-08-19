import { UNIVERSAL_REACTIONS, type UniversalReactionKind } from "./FreshReactionModel";
import { announceInteraction, interactionButtonProps } from "./FreshInteractionA11y";

export function UniversalReactionPicker({
  value,
  onChange,
}: {
  value?: UniversalReactionKind;
  onChange: (reaction: UniversalReactionKind) => void;
}) {
  return (
    <div role="toolbar" aria-label="Reactions">
      {UNIVERSAL_REACTIONS.filter((r) => r !== "custom").map((reaction) => (
        <button
          key={reaction}
          {...interactionButtonProps({ label: `React ${reaction}`, pressed: value === reaction })}
          onClick={() => {
            onChange(reaction);
            announceInteraction(`${reaction} reaction selected`);
          }}
        >
          {reaction}
        </button>
      ))}
    </div>
  );
}

export function UniversalCommentAttachmentPreview({
  name,
  kind,
  onRemove,
}: {
  name: string;
  kind: string;
  onRemove?: () => void;
}) {
  return (
    <div role="group" aria-label={`${kind} attachment ${name}`}>
      <span>{name}</span>
      {onRemove && <button {...interactionButtonProps({ label: `Remove ${name}` })} onClick={onRemove}>Remove</button>}
    </div>
  );
}
