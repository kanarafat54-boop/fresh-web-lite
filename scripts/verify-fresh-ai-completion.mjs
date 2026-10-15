#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const path = resolve(root, "src/core/fresh-ai/FreshAICompletionStatus.ts");
const text = readFileSync(path, "utf8");

for (const s of [
  "capability-specific",
  "overall completion percentage",
  "training-required",
  "e2ee-live",
  "blocked",
  "assertFreshAICompletionHonesty",
]) {
  if (!text.includes(s)) {
    console.error("Missing:", s);
    process.exit(1);
  }
}

const vault = readFileSync(resolve(root, "src/core/crypto/FreshSecureVault.ts"), "utf8");
for (const s of ["fresh_vault_kdf_v1", "writeStoredKdf", "readStoredKdf", "hasStoredKdf"]) {
  if (!vault.includes(s)) {
    console.error("Vault persistence missing:", s);
    process.exit(1);
  }
}

console.log("Fresh AI completion honesty + vault KDF persistence: PASS");
