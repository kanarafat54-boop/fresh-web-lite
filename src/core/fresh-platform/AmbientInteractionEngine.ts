/**
 * Ambient interaction signals for Fresh AI.
 *
 * This is opt-in, page-scoped interaction awareness—not identity recognition,
 * emotion detection, global cursor tracking, or background device surveillance.
 * Raw pointer coordinates and typed text are never retained or emitted.
 */

export type FreshInteractionSignal =
  | { type: "touch"; target: string; at: number }
  | { type: "click"; target: string; at: number }
  | { type: "hover"; target: string; at: number }
  | { type: "focus"; target: string; at: number }
  | { type: "repeated-action"; target: string; count: number; at: number };

export type FreshInteractionHint =
  | "user-interacting"
  | "possible-control-confusion"
  | "form-field-focused";

export type FreshInteractionOptions = {
  enabled: boolean;
  onSignal: (signal: FreshInteractionSignal) => void;
  onHint?: (hint: FreshInteractionHint) => void;
  now?: () => number;
};

const TARGET_SELECTOR = [
  "button", "a[href]", "input", "textarea", "select",
  "[role='button']", "[data-fresh-interaction]"
].join(",");

function describeTarget(target: EventTarget | null): string {
  if (!(target instanceof Element)) return "page";
  const control = target.closest(TARGET_SELECTOR);
  if (!control) return "page";
  const explicit = control.getAttribute("data-fresh-interaction");
  if (explicit) return explicit.slice(0, 64);
  const tag = control.tagName.toLowerCase();
  const role = control.getAttribute("role");
  return role ? tag + ":" + role : tag;
}

/**
 * Attach only to a Fresh Web Lite application root after the user enables
 * interaction assistance. Consumers must not persist signals by default.
 */
export function observeFreshInteractions(
  root: HTMLElement,
  options: FreshInteractionOptions,
): () => void {
  if (!options.enabled) return () => undefined;

  const now = options.now ?? Date.now;
  const recentActions = new Map<string, { count: number; at: number }>();
  let disposed = false;

  const emit = (signal: FreshInteractionSignal) => {
    if (disposed || document.visibilityState === "hidden") return;
    options.onSignal(signal);
  };

  const onPointerDown = (event: PointerEvent) => {
    const target = describeTarget(event.target);
    emit({ type: event.pointerType === "touch" ? "touch" : "click", target, at: now() });
    options.onHint?.("user-interacting");

    const previous = recentActions.get(target);
    const at = now();
    const count = previous && at - previous.at <= 5000 ? previous.count + 1 : 1;
    recentActions.set(target, { count, at });
    if (count >= 3) {
      emit({ type: "repeated-action", target, count, at });
      options.onHint?.("possible-control-confusion");
    }
  };

  const onPointerOver = (event: PointerEvent) => {
    if (event.pointerType === "touch") return;
    emit({ type: "hover", target: describeTarget(event.target), at: now() });
  };

  const onFocusIn = (event: FocusEvent) => {
    const target = describeTarget(event.target);
    emit({ type: "focus", target, at: now() });
    if (event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement) {
      options.onHint?.("form-field-focused");
    }
  };

  root.addEventListener("pointerdown", onPointerDown);
  root.addEventListener("pointerover", onPointerOver);
  root.addEventListener("focusin", onFocusIn);

  return () => {
    disposed = true;
    root.removeEventListener("pointerdown", onPointerDown);
    root.removeEventListener("pointerover", onPointerOver);
    root.removeEventListener("focusin", onFocusIn);
    recentActions.clear();
  };
}
