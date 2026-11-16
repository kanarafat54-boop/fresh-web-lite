import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { hashStream, isAllowedMediaUrl, registerFingerprint, fingerprintBody, MediaTooLargeError } from "../src/server/shortFingerprint.ts";

const SB = "https://abc.supabase.co";
const SID = "3f2b8c1e-5d4a-4e6f-9a7b-1c2d3e4f5a6b";
const ok = `${SB}/storage/v1/object/public/shorts/a.mp4`;

// Which media may be fetched.
assert.equal(isAllowedMediaUrl(ok, SB), true);
for (const bad of ["http://abc.supabase.co/storage/v1/object/public/a.mp4", "https://evil.example/storage/v1/object/public/a.mp4", "https://abc.supabase.co/rest/v1/shorts", "https://user:pw@abc.supabase.co/storage/v1/object/x", "https://abc.supabase.co.evil.example/storage/v1/object/x", "not a url", "file:///etc/passwd", "https://169.254.169.254/latest"]) assert.equal(isAllowedMediaUrl(bad, SB), false, bad);

const streamOf = (...chunks) => new ReadableStream({ start(c) { for (const ch of chunks) c.enqueue(new Uint8Array(ch)); c.close(); } });
const bytes = Buffer.from("fresh short video bytes ".repeat(5000));
const expect = createHash("sha256").update(bytes).digest("hex");
assert.deepEqual(await hashStream(streamOf(bytes.subarray(0, 777), bytes.subarray(777))), { sha256: expect, size: bytes.length });
await assert.rejects(hashStream(streamOf(Buffer.alloc(50), Buffer.alloc(60)), 100), MediaTooLargeError);
assert.equal((await hashStream(streamOf())).size, 0);

const canonical = (v) => JSON.stringify(Object.fromEntries(Object.entries(v).sort(([a], [b]) => a < b ? -1 : 1)));
const body = JSON.parse(fingerprintBody(canonical, SID, expect, 12));
assert.deepEqual(body, { short_id: SID, sha256: expect, size_bytes: 12, type: "fingerprint", v: 1 });

function deps(over = {}) {
  const store = { rows: new Map(), proofs: [], fetched: 0 };
  return { store, d: {
    supabaseUrl: SB, canonicalJson: canonical,
    loadShort: async (id) => id === SID ? { author_id: "u1", video_url: ok } : null,
    existing: async (id) => store.rows.get(id) ?? null,
    fetchMedia: async () => { store.fetched += 1; return { body: streamOf(bytes), contentLength: bytes.length }; },
    writeProof: async (a, id, b) => { store.proofs.push([a, id, b]); return { seq: store.proofs.length, hash: "h".repeat(64) }; },
    insert: async (row) => { const r = { ...row, registered_at: "2026-11-15T10:00:00Z" }; store.rows.set(row.short_id, r); return r; },
    matches: async (sha) => [...store.rows.values()].filter((r) => r.sha256 === sha).map((r) => ({ short_id: r.short_id, author_id: r.author_id, username: "ana", registered_at: r.registered_at, is_first: true })),
    ...over,
  } };
}

let t = deps();
let out = await registerFingerprint(t.d, "u1", SID);
assert.equal(out.ok && out.created, true);
assert.equal(out.fingerprint.sha256, expect);
assert.equal(out.fingerprint.proof_seq, 1);
assert.equal(t.store.proofs.length, 1);
assert.equal(out.matches.length, 1);
out = await registerFingerprint(t.d, "u1", SID);
assert.equal(out.ok && out.created, false, "asking again returns the first record");
assert.equal(t.store.fetched, 1, "no second download");
assert.equal(t.store.proofs.length, 1, "no second proof record");

t = deps();
assert.deepEqual((await registerFingerprint(t.d, "someone-else", SID)), { ok: false, status: 403, error: "Only the creator can register this Short's file." });
assert.equal(t.store.fetched, 0, "a stranger cannot make the server download anything");
assert.equal((await registerFingerprint(t.d, "u1", "nope")).status, 400);
assert.equal((await registerFingerprint(t.d, "u1", "11111111-1111-1111-1111-111111111111")).status, 404);
assert.equal((await registerFingerprint(deps({ loadShort: async () => ({ author_id: "u1", video_url: "https://evil.example/x.mp4" }) }).d, "u1", SID)).status, 422);
assert.equal((await registerFingerprint(deps({ loadShort: async () => ({ author_id: "u1", video_url: "" }) }).d, "u1", SID)).status, 422);
assert.equal((await registerFingerprint(deps({ fetchMedia: async () => { throw new Error("down"); } }).d, "u1", SID)).status, 502);
assert.equal((await registerFingerprint(deps({ fetchMedia: async () => ({ body: streamOf(bytes), contentLength: 999_999_999 }) }).d, "u1", SID)).status, 413);
assert.equal((await registerFingerprint(deps({ fetchMedia: async () => ({ body: streamOf(), contentLength: null }) }).d, "u1", SID)).status, 422);

// Two creators, same bytes: both get registered, earliest first is reported by the database.
t = deps({ matches: async () => [{ short_id: "s-first", author_id: "u9", username: "ben", registered_at: "2026-11-01T00:00:00Z", is_first: true }, { short_id: SID, author_id: "u1", username: "ana", registered_at: "2026-11-15T10:00:00Z", is_first: false }] });
out = await registerFingerprint(t.d, "u1", SID);
assert.equal(out.matches[0].username, "ben");
console.log("origin fingerprint server ok");

// Client: streaming SHA-256 must equal Node's for every length around the block boundaries.
import { Sha256, hashBlob } from "../src/features/fresh-flow/core/sha256.ts";
import { verdictFor, fileCheckFor, badgeWithVerification } from "../src/features/fresh-flow/core/originVerification.ts";
for (const n of [0, 1, 3, 55, 56, 57, 63, 64, 65, 119, 120, 121, 128, 1000, 4096, 100003]) {
  const data = Buffer.from(Array.from({ length: n }, (_, i) => (i * 31 + 7) % 256));
  assert.equal(new Sha256().update(new Uint8Array(data)).hex(), createHash("sha256").update(data).digest("hex"), `length ${n}`);
  const h = new Sha256(); // same bytes in odd-sized pieces
  for (let i = 0; i < n; i += 37) h.update(new Uint8Array(data.subarray(i, Math.min(n, i + 37))));
  assert.equal(h.hex(), createHash("sha256").update(data).digest("hex"), `pieces ${n}`);
}
assert.equal(new Sha256().update(new TextEncoder().encode("abc")).hex(), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad", "FIPS test vector");
const big = Buffer.alloc(9 * 1024 * 1024 + 5, 7);
assert.equal(await hashBlob({ size: big.length, slice: (a, b) => ({ arrayBuffer: async () => big.buffer.slice(big.byteOffset + a, big.byteOffset + b) }) }), createHash("sha256").update(big).digest("hex"));
const h2 = new Sha256(); h2.hex(); assert.throws(() => h2.update(new Uint8Array(1)));

const own = { sha256: "a".repeat(64), sizeBytes: 10, registeredAt: "2026-11-15T10:00:00Z", proofHash: null };
const m = (shortId, authorId, username, registeredAt) => ({ shortId, authorId, username, registeredAt, isFirst: false });
assert.equal(verdictFor("s1", "u1", null, null, []).kind, "unregistered");
assert.equal(verdictFor("s1", "u1", "original", own, [m("s1", "u1", "ana", own.registeredAt)]).kind, "first");
assert.equal(verdictFor("s1", "u1", "original", own, []).kind, "first", "no match rows yet still means first");
assert.equal(verdictFor("s1", "u1", "original", own, [m("s0", "u1", "ana", "2026-11-01T00:00:00Z"), m("s1", "u1", "ana", own.registeredAt)]).kind, "creator-earlier");
let v = verdictFor("s1", "u1", "original", own, [m("s1", "u1", "ana", own.registeredAt), m("s0", "u9", "ben", "2026-11-01T00:00:00Z")]);
assert.equal(v.kind, "earlier-copy"); assert.equal(v.conflict, true); assert.match(v.detail, /@ben/); assert.match(v.detail, /does not match/);
v = verdictFor("s1", "u1", "remix", own, [m("s0", "u9", "ben", "2026-11-01T00:00:00Z"), m("s1", "u1", "ana", own.registeredAt)]);
assert.equal(v.conflict, false); assert.match(v.headline, /credited/);
v = verdictFor("s1", "u1", null, own, [m("s0", "u9", null, "2026-11-01T00:00:00Z")]);
assert.match(v.detail, /another creator/); assert.equal(v.conflict, false);
assert.equal(fileCheckFor(own.sha256, own, []).kind, "this-short");
assert.equal(fileCheckFor("b".repeat(64), own, [m("s7", "u9", "ben", "2026-11-01T00:00:00Z")]).kind, "registered-elsewhere");
assert.equal(fileCheckFor("c".repeat(64), own, []).kind, "not-registered");
assert.equal(fileCheckFor("c".repeat(64), null, []).kind, "not-registered");
assert.equal(badgeWithVerification("Original · declared by creator", { kind: "unregistered" }), "Original · declared by creator");
assert.equal(badgeWithVerification(null, { kind: "first", headline: "", detail: "", conflict: false }), "File registered");
assert.match(badgeWithVerification("Original · declared by creator", { kind: "earlier-copy", headline: "", detail: "", conflict: true, first: m("s0", "u9", "b", "x") }), /earlier copy exists/);
console.log("origin verification client ok");
