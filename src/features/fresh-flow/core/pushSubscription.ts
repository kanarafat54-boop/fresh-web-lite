/** Pure helpers for Web Push on the client. */

export function urlBase64ToUint8Array(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const raw = atob(padded);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

export type PushRow = { user_id: string; endpoint: string; p256dh: string; auth: string; user_agent: string | null };

/** The row to store for a browser subscription, or null when the subscription is missing something needed to send. */
export function subscriptionToRow(userId: string, sub: { endpoint?: string; keys?: { p256dh?: string; auth?: string } }, userAgent: string | null): PushRow | null {
  const { endpoint, keys } = sub;
  if (!endpoint || !endpoint.startsWith("https://") || !keys?.p256dh || !keys.auth) return null;
  return { user_id: userId, endpoint, p256dh: keys.p256dh, auth: keys.auth, user_agent: userAgent ? userAgent.slice(0, 300) : null };
}

export type PushSupport = { supported: boolean; configured: boolean };
export function pushSupport(env: { hasServiceWorker: boolean; hasPushManager: boolean; vapidKey: string | undefined }): PushSupport {
  return { supported: env.hasServiceWorker && env.hasPushManager, configured: Boolean(env.vapidKey) };
}
