import { createECDH, createCipheriv, createPrivateKey, createSign, hkdfSync, randomBytes } from "node:crypto";

/**
 * Web Push without a third-party library: message encryption (RFC 8291, aes128gcm per RFC 8188) and VAPID
 * authentication (RFC 8292). Only the Node standard library is used.
 */

export type PushSubscriptionRecord = { endpoint: string; p256dh: string; auth: string };
export type VapidKeys = { publicKey: string; privateKey: string; subject: string };
export type PushResult = { ok: boolean; status: number; gone: boolean };

export const b64u = {
  encode: (buf: Uint8Array): string => Buffer.from(buf).toString("base64url"),
  decode: (text: string): Buffer => Buffer.from(text, "base64url"),
};

const RECORD_SIZE = 4096;
const MAX_PAYLOAD = RECORD_SIZE - 86; // header (16 + 4 + 1 + 65) plus 1 delimiter byte plus 16-byte tag leaves this much for the message

export function generateVapidKeys(): { publicKey: string; privateKey: string } {
  const ecdh = createECDH("prime256v1");
  ecdh.generateKeys();
  return { publicKey: b64u.encode(ecdh.getPublicKey()), privateKey: b64u.encode(ecdh.getPrivateKey()) };
}

/** Encrypts one message for one subscription. `senderKeys` and `salt` are injectable only so tests can be deterministic. */
export function encryptPayload(
  sub: Pick<PushSubscriptionRecord, "p256dh" | "auth">,
  message: string | Uint8Array,
  inject: { senderPrivate?: Buffer; salt?: Buffer } = {},
): Buffer {
  const data = typeof message === "string" ? Buffer.from(message, "utf8") : Buffer.from(message);
  if (data.length > MAX_PAYLOAD) throw new Error("Push message is too large (limit about 4000 bytes).");
  const uaPublic = b64u.decode(sub.p256dh);
  const authSecret = b64u.decode(sub.auth);
  if (uaPublic.length !== 65 || uaPublic[0] !== 4) throw new Error("Invalid subscription public key.");
  if (authSecret.length !== 16) throw new Error("Invalid subscription auth secret.");

  const sender = createECDH("prime256v1");
  if (inject.senderPrivate) sender.setPrivateKey(inject.senderPrivate); else sender.generateKeys();
  const asPublic = sender.getPublicKey();
  const ecdhSecret = sender.computeSecret(uaPublic);
  const salt = inject.salt ?? randomBytes(16);

  const keyInfo = Buffer.concat([Buffer.from("WebPush: info\0", "utf8"), uaPublic, asPublic]);
  const ikm = Buffer.from(hkdfSync("sha256", ecdhSecret, authSecret, keyInfo, 32));
  const cek = Buffer.from(hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: aes128gcm\0", "utf8"), 16));
  const nonce = Buffer.from(hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: nonce\0", "utf8"), 12));

  const cipher = createCipheriv("aes-128-gcm", cek, nonce);
  const encrypted = Buffer.concat([cipher.update(Buffer.concat([data, Buffer.from([2])])), cipher.final(), cipher.getAuthTag()]);

  const header = Buffer.alloc(21);
  salt.copy(header, 0);
  header.writeUInt32BE(RECORD_SIZE, 16);
  header[20] = asPublic.length;
  return Buffer.concat([header, asPublic, encrypted]);
}

/** A VAPID JWT (ES256) for the push service that owns `endpoint`. */
export function vapidAuthorization(endpoint: string, vapid: VapidKeys, nowSeconds: number = Math.floor(Date.now() / 1000)): string {
  const audience = new URL(endpoint).origin;
  const pub = b64u.decode(vapid.publicKey);
  const priv = b64u.decode(vapid.privateKey);
  if (pub.length !== 65 || priv.length !== 32) throw new Error("Invalid VAPID keys.");
  const head = b64u.encode(Buffer.from(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = b64u.encode(Buffer.from(JSON.stringify({ aud: audience, exp: nowSeconds + 12 * 3600, sub: vapid.subject })));
  const key = createPrivateKey({ key: { kty: "EC", crv: "P-256", x: b64u.encode(pub.subarray(1, 33)), y: b64u.encode(pub.subarray(33, 65)), d: b64u.encode(priv) }, format: "jwk" });
  const signature = createSign("SHA256").update(`${head}.${claims}`).sign({ key, dsaEncoding: "ieee-p1363" });
  return `vapid t=${head}.${claims}.${b64u.encode(signature)}, k=${vapid.publicKey}`;
}

export function readVapidEnv(env: Record<string, string | undefined> = process.env): VapidKeys | null {
  const publicKey = env.VAPID_PUBLIC_KEY || env.VITE_VAPID_PUBLIC_KEY;
  const privateKey = env.VAPID_PRIVATE_KEY;
  const subject = env.VAPID_SUBJECT || "mailto:kanarafat54@gmail.com";
  return publicKey && privateKey ? { publicKey, privateKey, subject } : null;
}

export async function sendPush(
  sub: PushSubscriptionRecord,
  message: string,
  vapid: VapidKeys,
  options: { ttlSeconds?: number; urgency?: "very-low" | "low" | "normal" | "high"; fetchImpl?: typeof fetch } = {},
): Promise<PushResult> {
  const body = encryptPayload(sub, message);
  const res = await (options.fetchImpl ?? fetch)(sub.endpoint, {
    method: "POST",
    headers: {
      authorization: vapidAuthorization(sub.endpoint, vapid),
      "content-encoding": "aes128gcm",
      "content-type": "application/octet-stream",
      ttl: String(options.ttlSeconds ?? 86400),
      urgency: options.urgency ?? "normal",
    },
    body,
  });
  return { ok: res.status >= 200 && res.status < 300, status: res.status, gone: res.status === 404 || res.status === 410 };
}
