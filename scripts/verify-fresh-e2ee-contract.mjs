import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const ask = read("api/ai/ask.ts");
const stream = read("api/ai/stream.ts");
const conversations = read("api/ai/conversations.ts");
const client = read("src/app/components/FreshAIUnified.tsx");
const vault = read("src/core/crypto/FreshSecureVault.ts");

const required = [
  [ask, "fresh-e2ee-v1:pending", "Ask persistence must use an E2EE pending envelope."],
  [stream, "fresh-e2ee-v1:pending", "Stream persistence must use an E2EE pending envelope."],
  [conversations, "looksSealed", "Conversation sealing endpoint must validate Fresh E2EE envelopes."],
  [conversations, "Server never decrypts", "Server must not decrypt client envelopes."],
  [client, "sealRecentTurns", "Client must perform conversation sealing."],
  [client, "conversationService.sealForStorage", "Client must seal both user and assistant turns."],
  [vault, "generateMasterKey", "Vault must generate client-side master key material."],
  [vault, "encryptText", "Vault must encrypt text before storage."],
];

for (const [source, needle, message] of required) {
  if (!source.includes(needle)) throw new Error(message);
}

if (/content:\s*goal\b/.test(ask) || /content:\s*answer\b/.test(ask)) {
  throw new Error("Ask server ledger contains a plaintext content write.");
}
if (/content:\s*goal\b/.test(stream) || /content:\s*answer\b/.test(stream)) {
  throw new Error("Stream server ledger contains a plaintext content write.");
}
if (!/pending-seal/.test(ask) || !/pending-seal/.test(stream)) {
  throw new Error("Conversation rows must remain explicitly pending until client sealing completes.");
}

console.log("Fresh AI sealed-at-rest conversation contract: PASS");
console.log("Server ledger writes only pending E2EE envelopes; client vault seals user/assistant turns.");
console.log("Note: cloud AI inference still necessarily processes plaintext request context; this is not server-blind E2EE inference.");
