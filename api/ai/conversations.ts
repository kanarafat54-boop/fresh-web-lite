import { createClient } from "@supabase/supabase-js";
import { createFreshAIServerSupabase } from "../../src/core/fresh-ai/FreshAIServerServices.js";

export const config = { maxDuration: 10 };

const json = (x: unknown, status = 200) =>
  Response.json(x, { status, headers: { "cache-control": "no-store" } });

async function user(req: Request) {
  const u = process.env.VITE_SUPABASE_URL;
  const k = process.env.VITE_SUPABASE_ANON_KEY;
  const a = req.headers.get("authorization") || "";
  const t = a.startsWith("Bearer ") ? a.slice(7) : "";
  if (!u || !k || !t) return null;
  const c = createClient(u, k, { auth: { persistSession: false, autoRefreshToken: false } });
  const r = await c.auth.getUser(t);
  return r.data.user ?? null;
}

function looksSealed(content: string): boolean {
  return typeof content === "string" && content.startsWith("fresh-e2ee-v1:");
}

export async function GET(req: Request): Promise<Response> {
  try {
    const u = await user(req);
    if (!u) return json({ conversation: null, turns: [] });
    const c = createFreshAIServerSupabase();
    if (!c) return json({ error: "Fresh AI persistence is not configured" }, 503);
    const id = new URL(req.url).searchParams.get("id");
    const q = id
      ? c
          .from("fresh_ai_conversations")
          .select("id,title,route,surface,model_id,created_at,updated_at")
          .eq("id", id)
          .eq("user_id", u.id)
          .maybeSingle()
      : c
          .from("fresh_ai_conversations")
          .select("id,title,route,surface,model_id,created_at,updated_at")
          .eq("user_id", u.id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
    const conversation = (await q).data;
    if (!conversation) return json({ conversation: null, turns: [] });
    const t = await c
      .from("fresh_ai_conversation_turns")
      .select("id,role,content,created_at,model_id,evidence")
      .eq("conversation_id", conversation.id)
      .eq("user_id", u.id)
      .in("role", ["user", "assistant"])
      .order("created_at", { ascending: true })
      .limit(100);
    return json({ conversation, turns: t.data ?? [] });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unable to load conversation" }, 500);
  }
}

/**
 * Seal the latest user + assistant turns with client-produced envelopes.
 * Server never decrypts; it only replaces content with ciphertext the client owns.
 */
export async function POST(req: Request): Promise<Response> {
  try {
    const u = await user(req);
    if (!u) return json({ error: "Authentication required" }, 401);
    const c = createFreshAIServerSupabase();
    if (!c) return json({ error: "Fresh AI persistence is not configured" }, 503);

    const body = (await req.json()) as {
      action?: string;
      conversationId?: string;
      sealedUserContent?: string;
      sealedAssistantContent?: string;
    };

    if (body.action !== "seal-latest") {
      return json({ error: "Unsupported action" }, 400);
    }

    const conversationId = typeof body.conversationId === "string" ? body.conversationId : "";
    const sealedUser = typeof body.sealedUserContent === "string" ? body.sealedUserContent : "";
    const sealedAssistant =
      typeof body.sealedAssistantContent === "string" ? body.sealedAssistantContent : "";

    if (!conversationId || !sealedUser || !sealedAssistant) {
      return json({ error: "conversationId and sealed contents are required" }, 400);
    }
    if (!looksSealed(sealedUser) || !looksSealed(sealedAssistant)) {
      return json({ error: "Payloads must be Fresh E2EE envelopes" }, 400);
    }
    if (sealedUser.length > 200_000 || sealedAssistant.length > 200_000) {
      return json({ error: "Sealed payload too large" }, 400);
    }

    const owner = await c
      .from("fresh_ai_conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("user_id", u.id)
      .maybeSingle();
    if (!owner.data) return json({ error: "Conversation not found" }, 404);

    const turns = await c
      .from("fresh_ai_conversation_turns")
      .select("id,role,created_at")
      .eq("conversation_id", conversationId)
      .eq("user_id", u.id)
      .in("role", ["user", "assistant"])
      .order("created_at", { ascending: false })
      .limit(8);

    const rows = turns.data ?? [];
    const latestAssistant = rows.find((row) => row.role === "assistant");
    const latestUser = rows.find((row) => row.role === "user");
    if (!latestUser || !latestAssistant) {
      return json({ error: "No turns available to seal" }, 404);
    }

    const userUpdate = await c
      .from("fresh_ai_conversation_turns")
      .update({ content: sealedUser })
      .eq("id", latestUser.id)
      .eq("user_id", u.id)
      .eq("conversation_id", conversationId);
    if (userUpdate.error) {
      return json({ error: `Failed to seal user turn: ${userUpdate.error.message}` }, 500);
    }

    const assistantUpdate = await c
      .from("fresh_ai_conversation_turns")
      .update({ content: sealedAssistant })
      .eq("id", latestAssistant.id)
      .eq("user_id", u.id)
      .eq("conversation_id", conversationId);
    if (assistantUpdate.error) {
      return json({ error: `Failed to seal assistant turn: ${assistantUpdate.error.message}` }, 500);
    }

    await c
      .from("fresh_ai_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId)
      .eq("user_id", u.id);

    return json({
      ok: true,
      conversationId,
      sealed: { userTurnId: latestUser.id, assistantTurnId: latestAssistant.id },
      note: "Server stored client envelopes only; plaintext is not recoverable without the user vault key.",
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unable to seal conversation" }, 500);
  }
}
