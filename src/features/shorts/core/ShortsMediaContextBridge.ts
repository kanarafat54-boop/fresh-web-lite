export type ShortsMediaContext = {
  mediaId: string;
  mediaKind: "short";
  provenance?: {
    sourceIds?: string[];
    origin?: string;
    capturedAt?: string;
  };
  lineage?: {
    parentMediaIds?: string[];
    relation?: "original" | "remix" | "duet" | "quote" | "translation" | "transformation";
  };
  accessibility?: {
    transcript?: boolean;
    captions?: boolean;
    audioDescription?: boolean;
  };
  capabilities?: ReadonlyArray<
    "comments" | "reactions" | "replies" | "remix" | "duet" | "share" | "save" | "immersive"
  >;
};

/**
 * Bridges Fresh Media OS context into the existing Shorts DOM without taking
 * ownership of ShortsModule's feed, playback, or interaction state.
 */
export function attachShortsMediaContext(
  container: HTMLElement,
  context: ShortsMediaContext,
): () => void {
  const previous = container.getAttribute("data-fresh-media-context");
  const contextJson = JSON.stringify(context);

  container.setAttribute("data-fresh-media-context", contextJson);
  container.dispatchEvent(
    new CustomEvent("fresh:media-context", {
      detail: context,
      bubbles: true,
    }),
  );

  return () => {
    if (previous === null) {
      container.removeAttribute("data-fresh-media-context");
    } else {
      container.setAttribute("data-fresh-media-context", previous);
    }
  };
}
