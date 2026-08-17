export type InteractionA11yOptions = {
  label: string;
  pressed?: boolean;
  disabled?: boolean;
};

export function interactionButtonProps(options: InteractionA11yOptions) {
  return {
    type: "button" as const,
    "aria-label": options.label,
    "aria-pressed": options.pressed,
    "aria-disabled": options.disabled,
    disabled: options.disabled,
  };
}

export function announceInteraction(message: string) {
  if (typeof document === "undefined") return;
  const node = document.createElement("div");
  node.setAttribute("role", "status");
  node.setAttribute("aria-live", "polite");
  node.className = "sr-only";
  node.textContent = message;
  document.body.appendChild(node);
  window.setTimeout(() => node.remove(), 1200);
}
