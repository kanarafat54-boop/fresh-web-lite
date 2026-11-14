import assert from "node:assert/strict";
import { normalizeFreshAddress, parseIdentityRequest, GENERIC_LOGIN_ERROR, GENERIC_RECOVERY_NOTICE } from "../src/server/freshMailIdentity.ts";

assert.equal(normalizeFreshAddress("  MemphisArafat@Fmail.com "), "memphisarafat@fmail.com");
assert.equal(normalizeFreshAddress("a.b+c-d_e@mail.example.org"), "a.b+c-d_e@mail.example.org");
for (const bad of ["", "no-at-sign", "a@b", "@fmail.com", "a b@fmail.com", "a@@fmail.com", "a..b@fmail.com", "a@fmail..com", "<x>@fmail.com", "a@fmail.c", null, undefined, 5, {}, "x".repeat(300) + "@fmail.com"]) {
  assert.equal(normalizeFreshAddress(bad), null, `rejects ${String(bad).slice(0, 20)}`);
}

assert.deepEqual(parseIdentityRequest({ action: "login", address: "A@Fmail.com", password: "pw" }), { action: "login", address: "a@fmail.com", password: "pw" });
assert.deepEqual(parseIdentityRequest({ action: "recover", address: "a@fmail.com", password: "ignored" }), { action: "recover", address: "a@fmail.com" });
assert.equal(parseIdentityRequest({ action: "login", address: "a@fmail.com" }), null, "login needs a password");
assert.equal(parseIdentityRequest({ action: "login", address: "a@fmail.com", password: "" }), null);
assert.equal(parseIdentityRequest({ action: "login", address: "a@fmail.com", password: "x".repeat(257) }), null);
assert.equal(parseIdentityRequest({ action: "delete", address: "a@fmail.com" }), null);
assert.equal(parseIdentityRequest({ action: "recover", address: "nope" }), null);
assert.equal(parseIdentityRequest(null), null);
assert.equal(parseIdentityRequest("x"), null);

assert.doesNotMatch(GENERIC_LOGIN_ERROR + GENERIC_RECOVERY_NOTICE, /@/, "messages never name an email");
console.log("fresh mail identity: ok");
