/** Public, shareable link that opens Fresh Shorts directly on one Short. */
export function shortDeepLink(shortId: string, origin: string): string {
  return `${origin.replace(/\/+$/, "")}/fresh-flow-shorts?short=${encodeURIComponent(shortId)}`;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Reads `?short=` from a URL search string; anything that is not a UUID is ignored. */
export function parseShortDeepLink(search: string): string | null {
  const value = new URLSearchParams(search).get("short");
  return value && UUID.test(value) ? value : null;
}
