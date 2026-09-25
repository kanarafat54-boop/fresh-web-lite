export type FreshFlowCreateIntent = {
  action?: string;
  sourceShortId?: string;
  sourceAuthorId?: string;
  sourceVideoUrl?: string;
  sourceCaption?: string;
  requestedAt?: string;
};

const INTENT_KEY = "fresh-flow-create-intent";
const FEED_REFRESH_KEY = "fresh-flow-feed-refresh";

export function readCreateIntent(): FreshFlowCreateIntent | null {
  try {
    const raw = sessionStorage.getItem(INTENT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as FreshFlowCreateIntent;
  } catch {
    return null;
  }
}

export function clearCreateIntent(): void {
  try {
    sessionStorage.removeItem(INTENT_KEY);
  } catch {
    /* ignore */
  }
}

/** Signal the Fresh Flow feed to reload after a successful publish. */
export function markFeedRefresh(publishedShortId?: string): void {
  const payload = { at: new Date().toISOString(), shortId: publishedShortId ?? null };
  try {
    sessionStorage.setItem(FEED_REFRESH_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
  try {
    window.dispatchEvent(new CustomEvent("fresh-flow-feed-refresh", { detail: payload }));
  } catch {
    /* ignore */
  }
}

export function consumeFeedRefresh(): { at: string; shortId: string | null } | null {
  try {
    const raw = sessionStorage.getItem(FEED_REFRESH_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(FEED_REFRESH_KEY);
    return JSON.parse(raw) as { at: string; shortId: string | null };
  } catch {
    return null;
  }
}

export function isShortCreateAction(action?: string): boolean {
  if (!action) return true;
  return ["create", "short", "remix", "duet", "quote", "edit", "captions", "effects", "collaborate"].includes(action);
}
