export const interactionA11y = {
  reactionLabel: (reaction: string, selected = false) => `${reaction}${selected ? ", selected" : ""}`,
  commentAttachmentLabel: (kind: string) => `Attach ${kind} comment`,
  replyLabel: (author: string) => `Reply to ${author}`,
  navigationHint: "Use arrow keys or swipe gestures to navigate media. Buttons remain available for non-touch input.",
};

export function onActivation(event: React.KeyboardEvent, action: () => void) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    action();
  }
}
