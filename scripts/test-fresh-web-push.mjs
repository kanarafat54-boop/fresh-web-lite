import assert from "node:assert/strict";
import { createECDH, createDecipheriv, createPublicKey, createVerify, hkdfSync } from "node:crypto";
import { encryptPayload, vapidAuthorization, generateVapidKeys, sendPush, b64u } from "../src/server/push/webPush.ts";

// A browser's subscription: its own key pair and a 16-byte auth secret.
const ua = createECDH("prime256v1"); ua.generateKeys();
const sub = { endpoint: "https://push.example.com/send/abc", p256dh: b64u.encode(ua.getPublicKey()), auth: b64u.encode(Buffer.alloc(16, 7)) };

/** Receiver side written from RFC 8291 section 3.4 / RFC 8188, so it checks the sender against the spec, not against itself. */
function decrypt(body) {
  const salt = body.subarray(0, 16);
  const rs = body.readUInt32BE(16);
  const idLen = body[20];
  const asPublic = body.subarray(21, 21 + idLen);
  const ct = body.subarray(21 + idLen);
  assert.equal(rs, 4096);
  const secret = ua.computeSecret(asPublic);
  const keyInfo = Buffer.concat([Buffer.from("WebPush: info\0"), ua.getPublicKey(), asPublic]);
  const ikm = Buffer.from(hkdfSync("sha256", secret, b64u.decode(sub.auth), keyInfo, 32));
  const cek = Buffer.from(hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: aes128gcm\0"), 16));
  const nonce = Buffer.from(hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: nonce\0"), 12));
  const d = createDecipheriv("aes-128-gcm", cek, nonce);
  d.setAuthTag(ct.subarray(ct.length - 16));
  const plain = Buffer.concat([d.update(ct.subarray(0, ct.length - 16)), d.final()]);
  assert.equal(plain[plain.length - 1], 2, "last record delimiter");
  return plain.subarray(0, plain.length - 1).toString("utf8");
}

const message = JSON.stringify({ title: "Fresh Shorts", body: "Ana replied: héllo ✓", url: "/shorts/1" });
assert.equal(decrypt(encryptPayload(sub, message)), message);
assert.equal(decrypt(encryptPayload(sub, "")), "");
assert.notDeepEqual(encryptPayload(sub, message), encryptPayload(sub, message), "fresh salt and key every time");
assert.throws(() => encryptPayload(sub, "x".repeat(4100)), /too large/);
assert.throws(() => encryptPayload({ ...sub, auth: "AAAA" }, "x"), /auth/);
assert.throws(() => encryptPayload({ ...sub, p256dh: "AAAA" }, "x"), /public key/);

// VAPID: the JWT verifies with the public key and names the push service's origin.
const keys = generateVapidKeys();
const vapid = { ...keys, subject: "mailto:owner@example.com" };
const header = vapidAuthorization(sub.endpoint, vapid, 1_800_000_000);
const m = /^vapid t=([^.]+)\.([^.]+)\.([^,]+), k=(.+)$/.exec(header);
assert.ok(m, "header shape");
assert.deepEqual(JSON.parse(b64u.decode(m[1]).toString()), { typ: "JWT", alg: "ES256" });
const claims = JSON.parse(b64u.decode(m[2]).toString());
assert.equal(claims.aud, "https://push.example.com");
assert.equal(claims.exp, 1_800_000_000 + 43200);
assert.equal(claims.sub, "mailto:owner@example.com");
assert.equal(m[4], keys.publicKey);
const pub = b64u.decode(keys.publicKey);
const pubKey = createPublicKey({ key: { kty: "EC", crv: "P-256", x: b64u.encode(pub.subarray(1, 33)), y: b64u.encode(pub.subarray(33, 65)) }, format: "jwk" });
assert.equal(createVerify("SHA256").update(`${m[1]}.${m[2]}`).verify({ key: pubKey, dsaEncoding: "ieee-p1363" }, b64u.decode(m[3])), true, "signature verifies");
assert.throws(() => vapidAuthorization(sub.endpoint, { ...vapid, privateKey: "AAAA" }), /VAPID/);

// Sending: right headers, and 404/410 mean the subscription is gone.
let seen;
const ok = await sendPush(sub, message, vapid, { fetchImpl: async (url, init) => { seen = { url, init }; return new Response(null, { status: 201 }); } });
assert.deepEqual(ok, { ok: true, status: 201, gone: false });
assert.equal(seen.url, sub.endpoint);
assert.equal(seen.init.headers["content-encoding"], "aes128gcm");
assert.equal(decrypt(Buffer.from(seen.init.body)), message);
assert.equal((await sendPush(sub, "x", vapid, { fetchImpl: async () => new Response(null, { status: 410 }) })).gone, true);
assert.equal((await sendPush(sub, "x", vapid, { fetchImpl: async () => new Response(null, { status: 404 }) })).gone, true);
assert.deepEqual(await sendPush(sub, "x", vapid, { fetchImpl: async () => new Response(null, { status: 500 }) }), { ok: false, status: 500, gone: false });
console.log("web push ok");

// Client helpers.
import { urlBase64ToUint8Array, subscriptionToRow, pushSupport } from "../src/features/fresh-flow/core/pushSubscription.ts";
import { deliveryStatus } from "../src/features/fresh-flow/core/notificationDelivery.ts";
assert.deepEqual([...urlBase64ToUint8Array(keys.publicKey)], [...b64u.decode(keys.publicKey)]);
assert.equal(urlBase64ToUint8Array(keys.publicKey).length, 65);
const goodSub = { endpoint: "https://push.example.com/x", keys: { p256dh: "a".repeat(87), auth: "b".repeat(22) } };
assert.deepEqual(subscriptionToRow("u1", goodSub, "UA"), { user_id: "u1", endpoint: goodSub.endpoint, p256dh: goodSub.keys.p256dh, auth: goodSub.keys.auth, user_agent: "UA" });
assert.equal(subscriptionToRow("u1", { endpoint: "http://insecure", keys: goodSub.keys }, null), null);
assert.equal(subscriptionToRow("u1", { endpoint: goodSub.endpoint, keys: { p256dh: "x" } }, null), null);
assert.equal(subscriptionToRow("u1", goodSub, "x".repeat(500)).user_agent.length, 300);
assert.deepEqual(pushSupport({ hasServiceWorker: true, hasPushManager: true, vapidKey: undefined }), { supported: true, configured: false });
assert.deepEqual(pushSupport({ hasServiceWorker: true, hasPushManager: false, vapidKey: "k" }), { supported: false, configured: true });
assert.match(deliveryStatus("granted", true, true).label, /even when Fresh is closed/);
assert.match(deliveryStatus("granted", true, false).label, /Not shown after you close Fresh/);
console.log("push client helpers ok");
