import assert from "node:assert/strict";
import { handleMachineRequest, generateToken, hashToken, parseBearer, buildManifest, CAPABILITIES } from "../src/server/machine/machineGateway.ts";
import { createSupabaseDeps, readMachineEnv } from "../src/server/machine/supabaseDeps.ts";

const A = "11111111-1111-4111-8111-111111111111";
const good = generateToken();
const audits = [];
const mkAuth = (over = {}) => ({ ok: true, reason: "ok", credentialId: "c1", principalId: "p1", scopes: ["shorts:read", "proof:read"], retryAfter: 0, ...over });
const deps = (auth = mkAuth(), extra = {}) => ({
  requestId: () => "req-1",
  authenticate: async (h) => (h === good.hash ? auth : mkAuth({ ok: false, reason: "unknown_token", credentialId: null, principalId: null, scopes: [] })),
  audit: async (e) => { audits.push(e); },
  listShorts: async (n) => Array.from({ length: n }, (_, i) => ({ id: `s${i}` })),
  proofRecords: async (a, after, limit) => [{ a, after, limit }],
  proofVerify: async () => ({ ok: true, checked: 3, broken_seq: null }),
  ...extra,
});
const get = (path, headers = {}, d = deps(), method = "GET") => handleMachineRequest(new Request(`https://x.test/api/machine/v1/${path}`, { method, headers }), path.split("?")[0], d);
const bearer = { authorization: `Bearer ${good.token}` };

// tokens
assert.ok(good.token.startsWith("fwm_") && good.hash.length === 64 && good.prefix.length === 8);
assert.notEqual(generateToken().token, good.token);
assert.equal(parseBearer(`Bearer ${good.token}`), good.token);
assert.equal(parseBearer("Bearer nope"), null);
assert.equal(parseBearer(null), null);
assert.equal(parseBearer(`Basic ${good.token}`), null);

// manifest: public, honest about maturity
let r = await get("manifest");
assert.equal(r.status, 200);
let j = await r.json();
assert.equal(j.ok, true);
assert.equal(j.meta.request_id, "req-1");
assert.ok(j.data.limits.some((l) => /physical/.test(l)));
assert.ok(buildManifest().capabilities.some((c) => c.maturity === "planned"));
assert.ok(CAPABILITIES.filter((c) => c.maturity === "planned").every((c) => c.scope === "shorts:write" || c.scope === "events:read"));

// write methods refused
for (const m of ["POST", "PUT", "DELETE", "PATCH"]) {
  r = await handleMachineRequest(new Request("https://x.test/a", { method: m }), "shorts", deps());
  assert.equal(r.status, 405);
}
// planned capability not callable
assert.equal((await get("events", bearer)).status, 404);
assert.equal((await get("nope", bearer)).status, 404);

// auth failures
audits.length = 0;
assert.equal((await get("shorts")).status, 401);
assert.equal((await get("shorts", { authorization: "Bearer fwm_" + "a".repeat(43) })).status, 401);
for (const [reason, status] of [["revoked", 401], ["expired", 401], ["principal_disabled", 403], ["rate_limited", 429]]) {
  r = await get("shorts", bearer, deps(mkAuth({ ok: false, reason, retryAfter: 17 })));
  assert.equal(r.status, status, reason);
  if (reason === "rate_limited") assert.equal(r.headers.get("retry-after"), "17");
  const body = await r.json();
  assert.ok(!JSON.stringify(body).includes(reason) || reason === "rate_limited", "reason not leaked");
}
// auth backend down -> 503
assert.equal((await get("shorts", bearer, deps(mkAuth(), { authenticate: async () => { throw new Error("db"); } }))).status, 503);

// scopes
r = await get("shorts", bearer, deps(mkAuth({ scopes: ["proof:read"] })));
assert.equal(r.status, 403);
assert.equal((await r.json()).error.code, "insufficient_scope");

// happy paths
r = await get("shorts?limit=3", bearer);
assert.equal((await r.json()).data.shorts.length, 3);
assert.equal((await (await get("shorts?limit=500", bearer)).json()).data.shorts.length, 50);
assert.equal((await get("shorts?limit=abc", bearer)).status, 400);
assert.equal((await get("proof/records", bearer)).status, 400);
assert.equal((await get("proof/records?author=not-a-uuid", bearer)).status, 400);
j = await (await get(`proof/records?author=${A.toUpperCase()}&after=2&limit=999`, bearer)).json();
assert.deepEqual(j.data.records[0], { a: A, after: 2, limit: 100 });
assert.equal((await (await get(`proof/verify?author=${A}`, bearer)).json()).data.checked, 3);

// upstream failure -> 502, still audited, no internals leaked
r = await get("shorts", bearer, deps(mkAuth(), { listShorts: async () => { throw new Error("secret detail"); } }));
assert.equal(r.status, 502);
assert.ok(!(await r.text()).includes("secret detail"));

// audit: every authenticated route call recorded, never the token; audit failure does not change the answer
assert.ok(audits.length > 5);
assert.ok(audits.every((a) => !JSON.stringify(a).includes(good.token) && a.method === "GET"));
assert.ok(audits.some((a) => a.status === 429 && a.credentialId === "c1"));
assert.equal((await get("shorts", bearer, deps(mkAuth(), { audit: async () => { throw new Error("x"); } }))).status, 200);

// Supabase deps over a fake PostgREST
const calls = [];
const fake = async (u, init) => {
  calls.push({ u: String(u), init });
  const s = String(u);
  if (s.includes("unlock_at")) return new Response("{}", { status: 400 });
  if (s.includes("rpc/machine_authenticate")) return Response.json([{ ok: true, reason: "ok", credential_id: "c", principal_id: "p", scopes: ["shorts:read"], retry_after: 0 }]);
  if (s.includes("rpc/proof_verify_chain")) return Response.json([{ ok: false, checked: "7", broken_seq: "4" }]);
  if (s.includes("machine_audit")) return new Response(null, { status: 201 });
  return Response.json([{ id: "s1" }]);
};
const env = readMachineEnv({ SUPABASE_URL: "https://p.supabase.co/", VITE_SUPABASE_ANON_KEY: "anon", SUPABASE_SECRET_KEY: "svc" });
assert.equal(env.url, "https://p.supabase.co");
assert.equal(readMachineEnv({ SUPABASE_URL: "x" }), null);
const real = createSupabaseDeps(env, fake);
assert.equal((await real.authenticate("h")).scopes[0], "shorts:read");
assert.deepEqual(await real.proofVerify(A), { ok: false, checked: 7, broken_seq: 4 });
assert.equal((await real.listShorts(5)).length, 1); // fell back when unlock_at missing
await real.audit({ principalId: "p", credentialId: "c", method: "GET", path: "/shorts", status: 200 });
const keyOf = (needle) => calls.find((c) => c.u.includes(needle)).init.headers.authorization;
assert.equal(keyOf("rpc/machine_authenticate"), "Bearer svc");
assert.equal(keyOf("machine_audit"), "Bearer svc");
await real.proofRecords(A, 0, 10);
assert.equal(keyOf("proof_records"), "Bearer anon");
assert.equal(keyOf("shorts?select"), "Bearer anon");
