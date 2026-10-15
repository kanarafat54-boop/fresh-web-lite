import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createVercelNodeHandler } from "../../src/server/vercelNodeAdapter.js";

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

function env(name: string): string | null {
  const value = process.env[name]?.trim();
  return value || null;
}

function bearer(req: Request): string | null {
  const header = req.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() || null : null;
}

function clients() {
  const url = env("SUPABASE_URL") ?? env("VITE_SUPABASE_URL");
  const publishable =
    env("SUPABASE_PUBLISHABLE_KEY") ??
    env("VITE_SUPABASE_PUBLISHABLE_KEY") ??
    env("VITE_SUPABASE_ANON_KEY");
  const secret =
    env("SUPABASE_SECRET_KEY_FRESHWEBLITE") ??
    env("SUPABASE_SECRET_KEY");
  if (!url || !publishable || !secret) return null;
  const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
  return {
    auth: createClient(url, publishable, options),
    admin: createClient(url, secret, options),
  };
}

type ConfiguredClients = NonNullable<ReturnType<typeof clients>>;

async function verifiedUser(req: Request, auth: ConfiguredClients["auth"]) {
  const token = bearer(req);
  if (!token) return null;
  const { data, error } = await auth.auth.getUser(token);
  return error ? null : data.user ?? null;
}

const emailPattern = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/i;
const stringArray = (value: unknown): string[] | null => {
  if (!Array.isArray(value) || value.length < 1 || value.length > 10) return null;
  if (!value.every((item) => typeof item === "string" && item.length <= 254 && emailPattern.test(item.trim()))) return null;
  return [...new Set(value.map((item) => (item as string).trim().toLowerCase()))];
};

export async function GET(req: Request): Promise<Response> {
  const configured = clients();
  if (!configured) return json({ error: "Fresh Mail server configuration is incomplete" }, 503);
  const user = await verifiedUser(req, configured.auth);
  if (!user) return json({ error: "Authentication required" }, 401);

  const parsedLimit = Number(new URL(req.url).searchParams.get("limit") ?? "30");
  const limit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(100, Math.floor(parsedLimit))) : 30;
  const [messagesResult, addressResult] = await Promise.all([
    configured.admin
      .from("fresh_mail_messages")
      .select("id,direction,from_address,to_addresses,cc_addresses,subject,text_body,html_body,status,created_at,sent_at,received_at")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit),
    configured.admin
      .from("fresh_mail_addresses")
      .select("email_address,status")
      .eq("owner_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  if (messagesResult.error || addressResult.error) {
    console.error("Fresh Mail list query failed", {
      messageCode: messagesResult.error?.code,
      addressCode: addressResult.error?.code,
    });
    return json({ error: "Fresh Mail storage is not ready" }, 503);
  }
  return json({ ok: true, messages: messagesResult.data ?? [], mailbox: addressResult.data ?? null });
}

export async function POST(req: Request): Promise<Response> {
  const configured = clients();
  if (!configured) return json({ error: "Fresh Mail server configuration is incomplete" }, 503);
  const user = await verifiedUser(req, configured.auth);
  if (!user) return json({ error: "Authentication required" }, 401);

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const to = stringArray(body.to);
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const textBody = typeof body.text === "string" ? body.text : "";
  const idempotencyKey = typeof body.idempotencyKey === "string" ? body.idempotencyKey.trim() : "";
  if (!to) return json({ error: "to must contain 1–10 valid email addresses" }, 400);
  if (!subject || subject.length > 200) return json({ error: "subject is required and must be at most 200 characters" }, 400);
  if (!textBody.trim() || textBody.length > 100_000) return json({ error: "text is required and must be at most 100,000 characters" }, 400);
  if (!/^[A-Za-z0-9._:-]{8,128}$/.test(idempotencyKey)) {
    return json({ error: "A stable idempotencyKey (8–128 safe characters) is required" }, 400);
  }

  const { data: address, error: addressError } = await configured.admin
    .from("fresh_mail_addresses")
    .select("email_address")
    .eq("owner_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (addressError) {
    console.error("Fresh Mail address lookup failed", { code: addressError.code });
    return json({ error: "Fresh Mail storage is not ready" }, 503);
  }
  if (!address?.email_address) {
    return json({ error: "No active Fresh Mail address is assigned to this account yet" }, 409);
  }

  const storedKey = `outbound:${idempotencyKey}`;
  const requestFingerprint = createHash("sha256")
    .update(JSON.stringify({ from: address.email_address, to, subject, text: textBody }))
    .digest("hex");
  const existing = await configured.admin
    .from("fresh_mail_messages")
    .select("id,status,provider_message_id,created_at,request_fingerprint,direction")
    .eq("owner_id", user.id)
    .eq("idempotency_key", storedKey)
    .maybeSingle();
  if (existing.error) return json({ error: "Fresh Mail storage is not ready" }, 503);
  if (existing.data && existing.data.direction !== "outbound") {
    return json({ error: "This idempotencyKey conflicts with an existing message" }, 409);
  }
  if (existing.data?.request_fingerprint && existing.data.request_fingerprint !== requestFingerprint) {
    return json({ error: "This idempotencyKey was already used for different message content" }, 409);
  }
  if (existing.data?.status === "sent") {
    return json({ ok: true, status: "sent", messageId: existing.data.id, providerMessageId: existing.data.provider_message_id, idempotentReplay: true });
  }
  if (existing.data?.status === "queued") {
    return json({ ok: true, status: "accepted_pending", messageId: existing.data.id, idempotentReplay: true }, 202);
  }

  let messageId = existing.data?.id as string | undefined;
  if (!messageId) {
    const inserted = await configured.admin
      .from("fresh_mail_messages")
      .insert({
        owner_id: user.id,
        provider: "resend",
        idempotency_key: storedKey,
        request_fingerprint: requestFingerprint,
        direction: "outbound",
        from_address: address.email_address,
        to_addresses: to,
        subject,
        text_body: textBody,
        status: "queued",
      })
      .select("id")
      .single();
    if (inserted.error) {
      // A concurrent request may have inserted this idempotency key first.
      if (inserted.error.code === "23505") {
        const raced = await configured.admin
          .from("fresh_mail_messages")
          .select("id,status,provider_message_id,request_fingerprint,direction")
          .eq("owner_id", user.id)
          .eq("idempotency_key", storedKey)
          .maybeSingle();
        if (raced.data && (raced.data.direction !== "outbound" || (raced.data.request_fingerprint && raced.data.request_fingerprint !== requestFingerprint))) {
          return json({ error: "This idempotencyKey was already used for different message content" }, 409);
        }
        if (raced.data?.status === "sent") {
          return json({ ok: true, status: "sent", messageId: raced.data.id, providerMessageId: raced.data.provider_message_id, idempotentReplay: true });
        }
        return json({ ok: true, status: "accepted_pending", messageId: raced.data?.id ?? null, idempotentReplay: true }, 202);
      }
      console.error("Fresh Mail outbound insert failed", { code: inserted.error.code });
      return json({ error: "Could not create the message record" }, 503);
    }
    messageId = inserted.data.id;
  } else {
    // Retry a failed attempt with the same provider idempotency key.
    const reset = await configured.admin
      .from("fresh_mail_messages")
      .update({ status: "queued", failure_code: null, updated_at: new Date().toISOString() })
      .eq("id", messageId)
      .eq("owner_id", user.id);
    if (reset.error) return json({ error: "Could not retry the message" }, 503);
  }

  const apiKey = env("RESEND_API_KEY");
  if (!apiKey) {
    await configured.admin.from("fresh_mail_messages")
      .update({ status: "failed", failure_code: "provider_not_configured", updated_at: new Date().toISOString() })
      .eq("id", messageId).eq("owner_id", user.id);
    return json({ error: "Email provider is not configured" }, 503);
  }

  let providerResponse: Response;
  try {
    providerResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `${user.id}:${storedKey}`,
      },
      body: JSON.stringify({ from: address.email_address, to, subject, text: textBody }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    await configured.admin.from("fresh_mail_messages")
      .update({ status: "failed", failure_code: "provider_unreachable", updated_at: new Date().toISOString() })
      .eq("id", messageId).eq("owner_id", user.id);
    return json({ error: "Email provider could not be reached; retry with the same idempotencyKey" }, 502);
  }

  const providerBody = await providerResponse.json().catch(() => ({})) as { id?: string; message?: string; name?: string };
  if (!providerResponse.ok || !providerBody.id) {
    await configured.admin.from("fresh_mail_messages")
      .update({ status: "failed", failure_code: `provider_http_${providerResponse.status}`, updated_at: new Date().toISOString() })
      .eq("id", messageId).eq("owner_id", user.id);
    return json({ error: "Provider did not accept the message", providerStatus: providerResponse.status }, 502);
  }

  const saved = await configured.admin.from("fresh_mail_messages")
    .update({
      provider_message_id: providerBody.id,
      status: "sent",
      sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", messageId)
    .eq("owner_id", user.id);
  if (saved.error) {
    console.error("Fresh Mail provider accepted message but ledger update failed", { messageId, code: saved.error.code });
    return json({ error: "Provider accepted the email, but Fresh Mail could not confirm local persistence. Retry only with the same idempotencyKey.", messageId }, 503);
  }

  // "sent" means accepted by the provider, not delivered to the recipient.
  return json({ ok: true, status: "sent", messageId, providerMessageId: providerBody.id }, 201);
}

export default createVercelNodeHandler({ GET, POST });
