import { timingSafeEqual } from "node:crypto";
import type { PushResult, PushSubscriptionRecord, VapidKeys } from "./webPush.js";

export type OutboxRow = { id: number; user_id: string; title: string; body: string; url: string; tag: string | null };

export type DispatchDeps = {
  /** Claims up to `limit` unsent rows (attempts < 5) so concurrent runs do not send the same message twice. */
  claim(limit: number): Promise<OutboxRow[]>;
  subscriptions(userId: string): Promise<Array<PushSubscriptionRecord & { id: string }>>;
  markSent(id: number): Promise<void>;
  markFailed(id: number): Promise<void>;
  removeSubscription(id: string): Promise<void>;
  send(sub: PushSubscriptionRecord, message: string): Promise<PushResult>;
};

export type DispatchSummary = { claimed: number; delivered: number; skipped: number; failed: number; pruned: number };

export function messageFor(row: OutboxRow): string {
  return JSON.stringify({ title: row.title, body: row.body, url: row.url, tag: row.tag ?? undefined });
}

/** Sends each claimed message to every subscription of its recipient. A row is done when at least one device accepted it, or when there is no device left to send to. */
export async function dispatchOutbox(deps: DispatchDeps, limit = 50): Promise<DispatchSummary> {
  const summary: DispatchSummary = { claimed: 0, delivered: 0, skipped: 0, failed: 0, pruned: 0 };
  const rows = await deps.claim(limit);
  summary.claimed = rows.length;
  for (const row of rows) {
    const subs = await deps.subscriptions(row.user_id);
    if (subs.length === 0) { await deps.markSent(row.id); summary.skipped += 1; continue; }
    let accepted = false;
    const message = messageFor(row);
    for (const sub of subs) {
      try {
        const result = await deps.send(sub, message);
        if (result.ok) accepted = true;
        else if (result.gone) { await deps.removeSubscription(sub.id); summary.pruned += 1; }
      } catch { /* one bad subscription must not stop the rest */ }
    }
    if (accepted) { await deps.markSent(row.id); summary.delivered += 1; }
    else if ((await deps.subscriptions(row.user_id)).length === 0) { await deps.markSent(row.id); summary.skipped += 1; }
    else { await deps.markFailed(row.id); summary.failed += 1; }
  }
  return summary;
}

export function secretMatches(provided: string | null, expected: string | undefined): boolean {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

type Env = Record<string, string | undefined>;

/** Entry used by the dispatcher in api/ai/ask.ts. Only the database (with the shared secret) may call it. */
export async function handlePushDispatch(req: Request, env: Env = process.env): Promise<Response> {
  const headers = { "cache-control": "no-store" };
  if (req.method !== "POST") return Response.json({ error: "Method not allowed." }, { status: 405, headers });
  if (!secretMatches(req.headers.get("x-fresh-push-secret"), env.FRESH_PUSH_SECRET)) return Response.json({ error: "Not allowed." }, { status: 401, headers });
  const publicKey = env.VAPID_PUBLIC_KEY || env.VITE_VAPID_PUBLIC_KEY;
  const privateKey = env.VAPID_PRIVATE_KEY;
  const vapid: VapidKeys | null = publicKey && privateKey ? { publicKey, privateKey, subject: env.VAPID_SUBJECT || "mailto:kanarafat54@gmail.com" } : null;
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const key = env.SUPABASE_SECRET_KEY_FRESHWEBLITE || env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  if (!vapid || !url || !key) return Response.json({ error: "Push is not configured." }, { status: 503, headers });

  const { createClient } = await import("@supabase/supabase-js");
  const { sendPush } = await import("./webPush.js");
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const staleBefore = () => new Date(Date.now() - 2 * 60 * 1000).toISOString();

  const deps: DispatchDeps = {
    async claim(limit) {
      const { data: candidates } = await db.from("push_outbox").select("id").is("sent_at", null).lt("attempts", 5).or(`claimed_at.is.null,claimed_at.lt.${staleBefore()}`).order("id").limit(limit);
      const ids = (candidates ?? []).map((r: { id: number }) => r.id);
      if (ids.length === 0) return [];
      const { data } = await db.from("push_outbox").update({ claimed_at: new Date().toISOString() }).in("id", ids).is("sent_at", null).or(`claimed_at.is.null,claimed_at.lt.${staleBefore()}`).select("id, user_id, title, body, url, tag");
      return (data ?? []) as OutboxRow[];
    },
    async subscriptions(userId) {
      const { data } = await db.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", userId);
      return (data ?? []) as Array<PushSubscriptionRecord & { id: string }>;
    },
    async markSent(id) { await db.from("push_outbox").update({ sent_at: new Date().toISOString() }).eq("id", id); },
    async markFailed(id) {
      const { data } = await db.from("push_outbox").select("attempts").eq("id", id).maybeSingle();
      await db.from("push_outbox").update({ attempts: ((data as { attempts?: number } | null)?.attempts ?? 0) + 1, claimed_at: null }).eq("id", id);
    },
    async removeSubscription(id) { await db.from("push_subscriptions").delete().eq("id", id); },
    send: (sub, message) => sendPush(sub, message, vapid, { ttlSeconds: 86400 }),
  };
  const summary = await dispatchOutbox(deps);
  return Response.json({ ok: true, ...summary }, { headers });
}
