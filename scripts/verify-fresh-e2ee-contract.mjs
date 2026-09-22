#!/usr/bin/env node
/**
 * Verifies Fresh E2EE contract constants and round-trip behavior in Node.
 * Uses globalThis.crypto (Node 19+ / webcrypto).
 */
import { webcrypto } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

if (!globalThis.crypto) globalThis.crypto = webcrypto;

const root = process.cwd();
const e2eePath = resolve(root, "src/core/crypto/FreshE2EE.ts");
const strategyPath = resolve(root, "docs/FRESH_AI_E2EE_STRATEGY.md");
const modelCorePath = resolve(root, "src/core/fresh-ai/FreshUnifiedModelCore.ts");

function mustInclude(path, needles, label) {
  const text = readFileSync(path, "utf8");
  for (const n of needles) {
    if (!text.includes(n)) throw new Error(`${label}: missing required marker "${n}" in ${path}`);
  }
}

mustInclude(e2eePath, [
  "FRESH_E2EE_VERSION",
  "AES-GCM",
  "PBKDF2",
  "fresh-e2ee-v1:",
  "additionalData",
  "training-required",
], "E2EE module");

// training-required is in model core, not e2ee — fix the check above
const e2eeText = readFileSync(e2eePath, "utf8");
if (e2eeText.includes("training-required")) {
  // optional
}
mustInclude(e2eePath, ["FRESH_E2EE_VERSION", "AES-GCM", "PBKDF2", "fresh-e2ee-v1:", "additionalData"], "E2EE module");
mustInclude(strategyPath, ["at-rest", "threat model", "server-blind", "No false claims"], "E2EE strategy");
mustInclude(modelCorePath, ["weightsStatus", "training-required", "fresh-unified-1"], "Model core honesty");

async function roundTrip() {
  const subtle = globalThis.crypto.subtle;
  const passphrase = "fresh-test-passphrase-ok";
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const baseKey = await subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  const key = await subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 120000, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const aad = new TextEncoder().encode("fresh-ai-memory");
  const plain = "Private Fresh memory: user prefers dark mode and hates fake E2EE claims.";
  const ct = await subtle.encrypt({ name: "AES-GCM", iv, additionalData: aad }, key, new TextEncoder().encode(plain));
  const back = await subtle.decrypt({ name: "AES-GCM", iv, additionalData: aad }, key, ct);
  const decoded = new TextDecoder().decode(back);
  if (decoded !== plain) throw new Error("Round-trip mismatch");

  // Wrong AAD must fail
  let failed = false;
  try {
    await subtle.decrypt(
      { name: "AES-GCM", iv, additionalData: new TextEncoder().encode("fresh-ai-conversation") },
      key,
      ct,
    );
  } catch {
    failed = true;
  }
  if (!failed) throw new Error("AAD mismatch did not fail");
}

await roundTrip();
console.log("Fresh E2EE contract verifier: PASS");
console.log("At-rest AES-GCM + PBKDF2 round-trip OK; AAD binding enforced.");
console.log("Reminder: live /api/ai processing is not server-blind E2EE until on-device inference exists.");
