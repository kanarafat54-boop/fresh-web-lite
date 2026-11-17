/**
 * Fresh Live — session control plane (Phase 1).
 *
 * Authenticated create / read / transition endpoints for live_sessions.
 * Does not issue media credentials or mark a session LIVE without a future
 * provider confirmation path. A mock or empty media plane must never set status=live.
 */
import { createVercelNodeHandler } from "../../src/server/vercelNodeAdapter.js";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type Action =
  | "create"
  | "get"
  | "list_mine"
  | "list_discover"
  | "prepare"
  | "start"
  | "end"
  | "cancel";

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft: ["ready", "scheduled", "cancelled"],
  scheduled: ["ready", "cancelled"],
  ready: ["live", "cancelled", "failed"],
  live: ["ending", "interrupted", "failed"],
  interrupted: ["live", "ending", "failed"],
  ending: ["ended", "failed"],
  ended: ["processing"],
  processing: ["replay_ready", "failed"],
  cancelled: [],
  failed: [],
  replay_ready: [],
};

const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });

function getBearer(req: Request): string | null {
  const value = req.headers.get("authorization") ?? "";
  return value.startsWith("Bearer ") ? value.slice(7).trim() : null;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing server environment variable: ${name}`);
  return value;
}

function clients(token: string): { authUserId: Promise<string | null>; admin: SupabaseClient } {
  const url = requireEnv("VITE_SUPABASE_URL");
  const publishableKey =
    process.env.VITE_SUPABASE_ANON_KEY ??
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!publishableKey) throw new Error("Missing Supabase publishable key");

  const authClient = createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const secretKey =
    process.env.SUPABASE_SECRET_KEY_FRESHWEBLITE ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secretKey) throw new Error("Missing Supabase secret key");

  const admin = createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const authUserId = (async () => {
    const { data, error } = await authClient.auth.getUser(token);
    if (error || !data.user) return null;
    return data.user.id;
  })();

  return { authUserId, admin };
}

function sanitizeTitle(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  if (t.length < 1 || t.length > 120) return null;
  return t;
}

function sanitizeVisibility(raw: unknown): "public" | "followers" | "unlisted" | "private" {
  if (raw === "followers" || raw === "unlisted" || raw === "private") return raw;
  return "public";
}

function sanitizeCategory(raw: unknown): string {
  if (typeof raw !== "string") return "other";
  const c = raw.trim().toLowerCase().slice(0, 64);
  return c || "other";
}

export async function POST(req: Request): Promise<Response> {
  const token = getBearer(req);
  if (!token) return json({ error: "Authentication required" }, 401);

  let body: { action?: Action; [key: string]: unknown };
  try {
    body = (await req.json()) as { action?: Action; [key: string]: unknown };
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (!body.action) return json({ error: "action is required" }, 400);

  try {
    const { authUserId, admin } = clients(token);
    const actorId = await authUserId;
    if (!actorId) return json({ error: "Invalid or expired session" }, 401);

    switch (body.action) {
      case "create": {
        const title = sanitizeTitle(body.title);
        if (!title) return json({ error: "title is required (1–120 characters)" }, 400);
        const visibility = sanitizeVisibility(body.visibility);
        const category = sanitizeCategory(body.category);
        const description =
          typeof body.description === "string" ? body.description.trim().slice(0, 2000) : "";

        const { data, error } = await admin
          .from("live_sessions")
          .insert({
            creator_id: actorId,
            title,
            description,
            category,
            visibility,
            status: "draft",
            media_mode: "unset",
          })
          .select("id, creator_id, title, description, category, visibility, status, media_mode, created_at")
          .single();

        if (error) throw error;

        // Record host membership.
        await admin.from("live_participants").insert({
          session_id: data.id,
          user_id: actorId,
          role: "host",
          state: "joined",
          joined_at: new Date().toISOString(),
        });

        return json({ ok: true, session: data });
      }

      case "get": {
        const id = typeof body.id === "string" ? body.id : null;
        if (!id) return json({ error: "id is required" }, 400);

        const { data, error } = await admin
          .from("live_sessions")
          .select(
            "id, creator_id, title, description, category, visibility, status, media_mode, scheduled_at, started_at, ended_at, created_at, updated_at",
          )
          .eq("id", id)
          .maybeSingle();

        if (error) throw error;
        if (!data) return json({ error: "Session not found" }, 404);

        // Visibility gate (defense in depth; RLS also applies for user-scoped clients).
        if (
          data.creator_id !== actorId &&
          (data.visibility === "private" || data.status === "draft" || data.status === "cancelled")
        ) {
          return json({ error: "Session not found" }, 404);
        }

        return json({ ok: true, session: data });
      }

      case "list_mine": {
        const { data, error } = await admin
          .from("live_sessions")
          .select(
            "id, title, category, visibility, status, media_mode, scheduled_at, started_at, ended_at, created_at",
          )
          .eq("creator_id", actorId)
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) throw error;
        return json({ ok: true, sessions: data ?? [] });
      }

      case "list_discover": {
        // Only intentionally public, non-draft sessions.
        const { data, error } = await admin
          .from("live_sessions")
          .select(
            "id, creator_id, title, category, visibility, status, media_mode, started_at, created_at",
          )
          .eq("visibility", "public")
          .in("status", ["ready", "live", "interrupted"])
          .order("created_at", { ascending: false })
          .limit(40);

        if (error) throw error;
        return json({ ok: true, sessions: data ?? [] });
      }

      case "prepare": {
        // Move draft/scheduled → ready. Does not create media resources yet.
        const id = typeof body.id === "string" ? body.id : null;
        if (!id) return json({ error: "id is required" }, 400);

        const { data: current, error: readErr } = await admin
          .from("live_sessions")
          .select("id, creator_id, status")
          .eq("id", id)
          .maybeSingle();

        if (readErr) throw readErr;
        if (!current || current.creator_id !== actorId) return json({ error: "Session not found" }, 404);

        const allowed = ALLOWED_TRANSITIONS[current.status] ?? [];
        if (!allowed.includes("ready")) {
          return json(
            { error: `Cannot prepare from status '${current.status}'` },
            409,
          );
        }

        const { data, error } = await admin
          .from("live_sessions")
          .update({ status: "ready" })
          .eq("id", id)
          .eq("creator_id", actorId)
          .select("id, status, updated_at")
          .single();

        if (error) throw error;
        return json({
          ok: true,
          session: data,
          note: "Session is ready for media attachment. No media provider is connected yet; status will not become live until a real ingest/session is confirmed.",
        });
      }

      case "start": {
        // Intentionally blocked until a media adapter can confirm resources.
        // This protects the product from false LIVE claims.
        return json(
          {
            error: "Media plane not connected",
            code: "LIVE_MEDIA_NOT_CONFIGURED",
            message:
              "Fresh Live control plane can create and prepare sessions, but starting a live broadcast requires an approved media provider adapter and confirmed ingest/playback resources. No paid infrastructure has been activated.",
          },
          503,
        );
      }

      case "end": {
        const id = typeof body.id === "string" ? body.id : null;
        if (!id) return json({ error: "id is required" }, 400);

        const { data: current, error: readErr } = await admin
          .from("live_sessions")
          .select("id, creator_id, status")
          .eq("id", id)
          .maybeSingle();

        if (readErr) throw readErr;
        if (!current || current.creator_id !== actorId) return json({ error: "Session not found" }, 404);

        const from = current.status;
        if (!['live', 'interrupted', 'ready', 'ending'].includes(from)) {
          return json({ error: `Cannot end from status '${from}'` }, 409);
        }

        const { data, error } = await admin
          .from("live_sessions")
          .update({
            status: "ended",
            ended_at: new Date().toISOString(),
          })
          .eq("id", id)
          .eq("creator_id", actorId)
          .select("id, status, ended_at, updated_at")
          .single();

        if (error) throw error;
        return json({ ok: true, session: data });
      }

      case "cancel": {
        const id = typeof body.id === "string" ? body.id : null;
        if (!id) return json({ error: "id is required" }, 400);

        const { data: current, error: readErr } = await admin
          .from("live_sessions")
          .select("id, creator_id, status")
          .eq("id", id)
          .maybeSingle();

        if (readErr) throw readErr;
        if (!current || current.creator_id !== actorId) return json({ error: "Session not found" }, 404);

        if (!['draft', 'scheduled', 'ready'].includes(current.status)) {
          return json({ error: `Cannot cancel from status '${current.status}'` }, 409);
        }

        const { data, error } = await admin
          .from("live_sessions")
          .update({ status: "cancelled" })
          .eq("id", id)
          .eq("creator_id", actorId)
          .select("id, status, updated_at")
          .single();

        if (error) throw error;
        return json({ ok: true, session: data });
      }

      default:
        return json({ error: "Unsupported action" }, 400);
    }
  } catch (error) {
    console.error("Fresh Live session API error", {
      action: body.action,
      error: error instanceof Error ? error.message : "unknown",
    });
    return json(
      { error: error instanceof Error ? error.message : "Live session operation failed" },
      400,
    );
  }
}

export default createVercelNodeHandler({ POST });
