/**
 * Fresh Live — session control plane (Phase 1).
 *
 * Authenticated create / read / transition endpoints for live_sessions.
 * Does not issue media credentials or mark a session LIVE without a
 * configured LiveMediaAdapter. A mock or empty media plane must never set status=live.
 */
import { createVercelNodeHandler } from "../../src/server/vercelNodeAdapter.js";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getLiveMediaAdapter } from "../../src/core/live/mediaAdapter.js";
import {
  canTransition,
  type LiveSessionStatus,
} from "../../src/core/live/sessionStateMachine.js";

type Action =
  | "create"
  | "get"
  | "list_mine"
  | "list_discover"
  | "prepare"
  | "start"
  | "end"
  | "cancel";

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

function asStatus(value: string): LiveSessionStatus {
  return value as LiveSessionStatus;
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

    const media = getLiveMediaAdapter();
    const mediaConfigured = media.isConfigured();

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
        const id = typeof body.id === "string" ? body.id : null;
        if (!id) return json({ error: "id is required" }, 400);

        const { data: current, error: readErr } = await admin
          .from("live_sessions")
          .select("id, creator_id, status")
          .eq("id", id)
          .maybeSingle();

        if (readErr) throw readErr;
        if (!current || current.creator_id !== actorId) return json({ error: "Session not found" }, 404);

        const decision = canTransition(asStatus(current.status), "ready", {
          mediaConfigured,
          isCreator: true,
        });
        if (!decision.ok) {
          return json({ error: decision.reason, code: decision.code }, 409);
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
        const id = typeof body.id === "string" ? body.id : null;
        if (!id) return json({ error: "id is required" }, 400);

        const { data: current, error: readErr } = await admin
          .from("live_sessions")
          .select("id, creator_id, status")
          .eq("id", id)
          .maybeSingle();

        if (readErr) throw readErr;
        if (!current || current.creator_id !== actorId) return json({ error: "Session not found" }, 404);

        const decision = canTransition(asStatus(current.status), "live", {
          mediaConfigured,
          isCreator: true,
        });

        if (!decision.ok) {
          const statusCode = decision.code === "LIVE_MEDIA_NOT_CONFIGURED" ? 503 : 409;
          return json(
            {
              error: decision.reason,
              code: decision.code,
              message:
                decision.code === "LIVE_MEDIA_NOT_CONFIGURED"
                  ? "Fresh Live control plane can create and prepare sessions, but starting a live broadcast requires an approved media provider adapter and confirmed ingest/playback resources. No paid infrastructure has been activated."
                  : decision.reason,
            },
            statusCode,
          );
        }

        // Future path: create media resources, confirm health, then set live + started_at.
        // Unreachable today because NotConfiguredMediaAdapter.isConfigured() is false.
        return json(
          {
            error: "Media plane not connected",
            code: "LIVE_MEDIA_NOT_CONFIGURED",
            message:
              "Adapter reported configured but no provider implementation is wired. Refusing to mark LIVE.",
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

        const from = asStatus(current.status);
        // Allow ending from ready (never went live) or through ending from live/interrupted.
        let target: LiveSessionStatus = "ended";
        if (from === "live" || from === "interrupted") {
          const toEnding = canTransition(from, "ending", { mediaConfigured, isCreator: true });
          if (!toEnding.ok) return json({ error: toEnding.reason, code: toEnding.code }, 409);
          target = "ended";
        } else if (from === "ready" || from === "ending") {
          // ready → cancelled is preferred; treat end of ready as cancelled-equivalent ended for UX simplicity
          // Use cancelled for never-live, ended when already live path.
          if (from === "ready") {
            const cancel = canTransition("ready", "cancelled", { mediaConfigured, isCreator: true });
            if (!cancel.ok) return json({ error: cancel.reason, code: cancel.code }, 409);
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
        } else {
          return json({ error: `Cannot end from status '${from}'`, code: "LIVE_INVALID_TRANSITION" }, 409);
        }

        const { data, error } = await admin
          .from("live_sessions")
          .update({
            status: target,
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

        const decision = canTransition(asStatus(current.status), "cancelled", {
          mediaConfigured,
          isCreator: true,
        });
        if (!decision.ok) {
          return json({ error: decision.reason, code: decision.code }, 409);
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
