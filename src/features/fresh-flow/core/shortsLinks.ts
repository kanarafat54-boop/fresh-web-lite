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

/** Canonical in-app routes from the Fresh Shorts specification. */
export const SHORTS_HOME_PATH = "/flow/shorts";

export function shortWatchPath(shortId: string): string {
  return `${SHORTS_HOME_PATH}/watch/${encodeURIComponent(shortId)}`;
}

/** Reads `/flow/shorts/watch/:shortId`; anything that is not a UUID is ignored. */
export function parseShortWatchPath(pathname: string): string | null {
  const match = /^\/flow\/shorts\/watch\/([^/]+)\/?$/.exec(pathname);
  if (!match) return null;
  let id = "";
  try { id = decodeURIComponent(match[1]); } catch { return null; }
  return UUID.test(id) ? id : null;
}

/** True for `/flow/shorts` and `/flow/shorts/watch/...`, which both open the Shorts environment. */
export function isShortsPath(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, "");
  return path === SHORTS_HOME_PATH || path.startsWith(`${SHORTS_HOME_PATH}/watch/`);
}

/** A Short requested by either the watch path or the older `?short=` link. */
export function parseRequestedShort(search: string, pathname: string): string | null {
  return parseShortWatchPath(pathname) ?? parseShortDeepLink(search);
}
