import ShortsFeedShell from "./ShortsFeedShell";

/**
 * Fresh Flow is the universal media discovery surface.
 *
 * The existing Shorts feed remains the first media mode. This shell gives it a
 * product-level identity without replacing the underlying feed implementation,
 * so long-form, live, news, audio and immersive modes can adopt the same
 * surface incrementally.
 */
export default function FreshFlow() {
  return <ShortsFeedShell />;
}
