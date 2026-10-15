import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createVercelNodeHandler } from "../src/server/vercelNodeAdapter.js";

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
      .select("id,direction,from_address,to_addresses,cc_addresses,subject,text_body,status,created_at,sent_at,received_at")
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

async function handleWebhook(req: Request): Promise<Response> {
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



async function provisionMailbox(req: Request): Promise<Response> {
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

  const localPart = typeof body.localPart === "string" ? body.localPart.trim().toLowerCase() : "";
  if (
    localPart.length < 3 ||
    localPart.length > 32 ||
    !/^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])$/.test(localPart) ||
    localPart.includes("..")
  ) {
    return json({ error: "Choose a mailbox name with 3–32 letters, numbers, dots, underscores, or hyphens. It must start and end with a letter or number." }, 400);
  }

  const apiKey = env("RESEND_API_KEY");
  const domain = (env("FRESH_MAIL_DOMAIN") ?? "").toLowerCase();
  const domainId = env("FRESH_MAIL_DOMAIN_ID");
  if (!apiKey || !domain || !domainId) {
    return json({ error: "Mailbox provisioning is not configured. A verified Resend domain with receiving enabled is required." }, 503);
  }

  const prior = await configured.admin.from("fresh_mail_addresses")
    .select("email_address,status")
    .eq("owner_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (prior.error) return json({ error: "Fresh Mail storage is not ready" }, 503);
  if (prior.data) return json({ ok: true, mailbox: prior.data, alreadyAssigned: true });

  let domainResponse: Response;
  try {
    domainResponse = await fetch(`https://api.resend.com/domains/${encodeURIComponent(domainId)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return json({ error: "Could not verify the email domain with the provider" }, 502);
  }
  if (!domainResponse.ok) {
    return json({ error: "The configured email domain could not be verified with the provider" }, 503);
  }
  const providerDomain = await domainResponse.json().catch(() => null) as {
    id?: string;
    name?: string;
    status?: string;
    capabilities?: { sending?: string; receiving?: string };
  } | null;
  if (
    !providerDomain ||
    providerDomain.id !== domainId ||
    providerDomain.name?.toLowerCase() !== domain ||
    providerDomain.status !== "verified" ||
    providerDomain.capabilities?.sending !== "enabled" ||
    providerDomain.capabilities?.receiving !== "enabled"
  ) {
    return json({ error: "The configured domain is not verified for both sending and receiving" }, 409);
  }

  const emailAddress = `${localPart}@${domain}`;
  const inserted = await configured.admin.from("fresh_mail_addresses")
    .insert({ owner_id: user.id, email_address: emailAddress, provider: "resend", status: "active" })
    .select("email_address,status")
    .single();
  if (inserted.error) {
    if (inserted.error.code === "23505") {
      const ownerAddress = await configured.admin.from("fresh_mail_addresses")
        .select("email_address,status")
        .eq("owner_id", user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      if (ownerAddress.data) return json({ ok: true, mailbox: ownerAddress.data, alreadyAssigned: true });
      return json({ error: "That mailbox name is already taken. Choose another name." }, 409);
    }
    console.error("Fresh Mail mailbox provisioning failed", { code: inserted.error.code });
    return json({ error: "Could not assign this mailbox" }, 503);
  }

  return json({ ok: true, mailbox: inserted.data }, 201);
}

async function sendOutbound(req: Request): Promise<Response> {
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



export async function POST(req: Request): Promise<Response> {
  const params = new URL(req.url).searchParams;
  if (params.get("webhook") === "1") return handleWebhook(req);
  if (params.get("provision") === "1") return provisionMailbox(req);
  return sendOutbound(req);
}

export default createVercelNodeHandler({ GET, POST });
