import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createVercelNodeHandler } from "../../src/server/vercelNodeAdapter.js";

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

function env(name: string): string | null {
  const value = process.env[name]?.trim();
  return value || null;
}

function verifySignature(rawBody: string, req: Request, secretValue: string): boolean {
  const id = req.headers.get("svix-id") ?? "";
  const timestamp = req.headers.get("svix-timestamp") ?? "";
  const signatures = req.headers.get("svix-signature") ?? "";
  const seconds = Number(timestamp);
  if (!id || !timestamp || !signatures || !Number.isFinite(seconds)) return false;
  if (Math.abs(Date.now() / 1000 - seconds) > 300) return false;

  const secret = secretValue.startsWith("whsec_") ? secretValue.slice(6) : secretValue;
  let key: Buffer;
  try {
    key = Buffer.from(secret, "base64");
  } catch {
    return false;
  }
  if (!key.length) return false;

  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${rawBody}`).digest();
  return signatures.split(" ").some((entry) => {
    const [version, encoded] = entry.split(",", 2);
    if (version !== "v1" || !encoded) return false;
    try {
      const actual = Buffer.from(encoded, "base64");
      return actual.length === expected.length && timingSafeEqual(actual, expected);
    } catch {
      return false;
    }
  });
}

function adminClient() {
  const url = env("SUPABASE_URL") ?? env("VITE_SUPABASE_URL");
  const key = env("SUPABASE_SECRET_KEY_FRESHWEBLITE") ?? env("SUPABASE_SECRET_KEY");
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function normalizeAddress(value: string): string {
  const bracketed = value.match(/<([^<>]+)>/);
  return (bracketed?.[1] ?? value).trim().toLowerCase();
}

type ReceivedEmail = {
  id?: string;
  from?: string;
  to?: string[];
  cc?: string[] | null;
  subject?: string | null;
  text?: string | null;
  html?: string | null;
  created_at?: string;
};

type ResendEvent = {
  type?: string;
  data?: { email_id?: string };
};

export async function POST(req: Request): Promise<Response> {
  const secret = env("RESEND_WEBHOOK_SECRET");
  const apiKey = env("RESEND_API_KEY");
  const admin = adminClient();
  if (!secret || !apiKey || !admin) {
    return json({ error: "Fresh Mail webhook configuration is incomplete" }, 503);
  }

  const rawBody = await req.text();
  if (rawBody.length > 1_000_000) return json({ error: "Webhook payload too large" }, 413);
  if (!verifySignature(rawBody, req, secret)) return json({ error: "Invalid webhook signature" }, 401);

  let event: ResendEvent;
  try {
    event = JSON.parse(rawBody) as ResendEvent;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const eventId = req.headers.get("svix-id")!;
  const eventType = typeof event.type === "string" ? event.type : "";
  const emailId = typeof event.data?.email_id === "string" ? event.data.email_id : "";
  if (!eventType || !emailId) return json({ error: "Malformed provider event" }, 400);

  const inserted = await admin.from("fresh_mail_webhook_events").insert({
    provider: "resend",
    provider_event_id: eventId,
    provider_message_id: emailId,
    event_type: eventType,
    status: "processing",
  });

  if (inserted.error?.code === "23505") {
    const prior = await admin.from("fresh_mail_webhook_events")
      .select("status")
      .eq("provider", "resend")
      .eq("provider_event_id", eventId)
      .maybeSingle();
    if (prior.data?.status === "processed" || prior.data?.status === "ignored") {
      return json({ ok: true, duplicate: true });
    }
    if (prior.data?.status === "processing") {
      return json({ ok: true, duplicate: true, status: "processing" }, 202);
    }
    await admin.from("fresh_mail_webhook_events")
      .update({ status: "processing", failure_code: null })
      .eq("provider", "resend")
      .eq("provider_event_id", eventId);
  } else if (inserted.error) {
    console.error("Fresh Mail webhook ledger insert failed", { code: inserted.error.code });
    return json({ error: "Webhook ledger is unavailable" }, 503);
  }

  if (eventType !== "email.received") {
    await admin.from("fresh_mail_webhook_events")
      .update({ status: "ignored", processed_at: new Date().toISOString() })
      .eq("provider", "resend").eq("provider_event_id", eventId);
    return json({ ok: true, ignored: true });
  }

  try {
    const providerResponse = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (!providerResponse.ok) throw new Error(`provider_http_${providerResponse.status}`);
    const email = await providerResponse.json() as ReceivedEmail;
    if (!email.id || !email.from || !Array.isArray(email.to)) throw new Error("provider_payload_invalid");

    const recipients = [...new Set(email.to.map(normalizeAddress).filter(Boolean))];
    const { data: addresses, error: addressError } = await admin
      .from("fresh_mail_addresses")
      .select("owner_id,email_address")
      .eq("status", "active")
      .in("email_address", recipients);
    if (addressError) throw new Error("mail_address_lookup_failed");

    if (!addresses?.length) {
      await admin.from("fresh_mail_webhook_events")
        .update({ status: "ignored", processed_at: new Date().toISOString() })
        .eq("provider", "resend").eq("provider_event_id", eventId);
      return json({ ok: true, ignored: true, reason: "no_active_mailbox_match" });
    }

    for (const address of addresses) {
      const existing = await admin.from("fresh_mail_messages")
        .select("id")
        .eq("owner_id", address.owner_id)
        .eq("provider", "resend")
        .eq("provider_message_id", email.id)
        .maybeSingle();
      if (existing.data) continue;
      if (existing.error) throw new Error("mail_message_dedupe_check_failed");

      const saved = await admin.from("fresh_mail_messages").insert({
        owner_id: address.owner_id,
        provider: "resend",
        provider_message_id: email.id,
        idempotency_key: `inbound:${email.id}`,
        direction: "inbound",
        from_address: normalizeAddress(email.from),
        to_addresses: recipients,
        cc_addresses: (email.cc ?? []).map(normalizeAddress),
        subject: (email.subject ?? "").slice(0, 200),
        text_body: (email.text ?? "").slice(0, 100_000),
        html_body: email.html ? email.html.slice(0, 100_000) : null,
        status: "received",
        received_at: email.created_at ?? new Date().toISOString(),
      });
      if (saved.error && saved.error.code !== "23505") throw new Error("mail_message_persist_failed");
    }

    const completed = await admin.from("fresh_mail_webhook_events")
      .update({ status: "processed", processed_at: new Date().toISOString(), failure_code: null })
      .eq("provider", "resend").eq("provider_event_id", eventId);
    if (completed.error) throw new Error("webhook_completion_update_failed");
    return json({ ok: true, status: "processed" });
  } catch (error) {
    const code = error instanceof Error ? error.message.slice(0, 80) : "processing_failed";
    await admin.from("fresh_mail_webhook_events")
      .update({ status: "failed", failure_code: code })
      .eq("provider", "resend").eq("provider_event_id", eventId);
    console.error("Fresh Mail inbound processing failed", { eventId, code });
    return json({ error: "Inbound email could not be persisted; provider retry is safe" }, 503);
  }
}

export default createVercelNodeHandler({ POST });
