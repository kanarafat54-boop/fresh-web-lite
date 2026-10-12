import { createVercelNodeHandler } from "../../src/server/vercelNodeAdapter.js";
import { createClient } from "@supabase/supabase-js";

type Action =
  | "ensure_user_account"
  | "resolve_recipient"
  | "resolve_recipient_by_id"
  | "transfer_internal"
  | "create_rail_request"
  | "create_and_sandbox_settle_rail_request";

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
    const url = requireEnv("VITE_SUPABASE_URL");
    const publishableKey =
      process.env.SUPABASE_PUBLISHABLE_KEY ??
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
      process.env.VITE_SUPABASE_ANON_KEY;
    if (!publishableKey) throw new Error("Missing Supabase publishable key");

    // This client exists only to validate the caller's actual Auth JWT.
    const authClient = createClient(url, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data: authData, error: authError } = await authClient.auth.getUser(token);
    if (authError || !authData.user) return json({ error: "Invalid or expired session" }, 401);

    // Secret key is server-only. It is never sent to the browser.
    const secretKey = requireEnv("SUPABASE_SECRET_KEY");
    const admin = createClient(url, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const actorId = authData.user.id;
    let result: unknown;

    switch (body.action) {
      case "ensure_user_account": {
        const { data, error } = await admin.rpc("treasury_ensure_user_account", {
          p_actor_id: actorId,
          p_asset_code: body.assetCode,
          p_asset_kind: body.assetKind,
          p_display_name: body.displayName ?? null,
        });
        if (error) throw error;
        result = data;
        break;
      }
      case "resolve_recipient": {
        const { data, error } = await admin.rpc("treasury_resolve_recipient", {
          p_actor_id: actorId,
          p_username: body.username,
          p_asset_code: body.assetCode ?? "FRESH",
        });
        if (error) throw error;
        result = Array.isArray(data) ? data[0] ?? null : data;
        break;
      }
      case "resolve_recipient_by_id": {
        const { data, error } = await admin.rpc("treasury_resolve_recipient_by_id", {
          p_actor_id: actorId,
          p_recipient_id: body.recipientId,
          p_asset_code: body.assetCode ?? "FRESH",
        });
        if (error) throw error;
        result = Array.isArray(data) ? data[0] ?? null : data;
        break;
      }
      case "transfer_internal": {
        const { data, error } = await admin.rpc("treasury_transfer_internal", {
          p_actor_id: actorId,
          p_from_account_id: body.fromAccountId,
          p_to_account_id: body.toAccountId,
          p_amount_minor: body.amountMinor,
          p_idempotency_key: body.idempotencyKey,
          p_description: body.description ?? "Fresh internal transfer",
        });
        if (error) throw error;
        result = data;
        break;
      }
      case "create_rail_request": {
        const { data, error } = await admin.rpc("treasury_create_rail_request", {
          p_actor_id: actorId,
          p_direction: body.direction,
          p_method_id: body.methodId,
          p_family: body.family,
          p_amount_minor: body.amountMinor,
          p_currency_code: body.currencyCode,
          p_instrument_id: body.instrumentId ?? null,
          p_metadata: body.metadata ?? {},
        });
        if (error) throw error;
        result = { requestId: data, status: "pending", sandbox: false };
        break;
      }
      case "create_and_sandbox_settle_rail_request": {
        const { data, error } = await admin.rpc("treasury_create_and_sandbox_settle_rail_request", {
          p_actor_id: actorId,
          p_direction: body.direction,
          p_method_id: body.methodId,
          p_family: body.family,
          p_amount_minor: body.amountMinor,
          p_currency_code: body.currencyCode,
          p_instrument_id: body.instrumentId ?? null,
          p_metadata: body.metadata ?? {},
        });
        if (error) throw error;
        result = data;
        break;
      }
      default:
        return json({ error: "Unsupported treasury action" }, 400);
    }

    return json({ ok: true, data: result });
  } catch (error) {
    console.error("Fresh Treasury server boundary error", {
      action: body.action,
      error: error instanceof Error ? error.message : "unknown",
    });
    return json(
      { error: error instanceof Error ? error.message : "Treasury operation failed" },
      400,
    );
  }
}

export default createVercelNodeHandler({ POST });
