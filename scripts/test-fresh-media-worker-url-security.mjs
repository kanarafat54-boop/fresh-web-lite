import assert from "node:assert/strict";
import { assertSafeMediaUrl, isPublicAddress } from "../workers/media-worker/media-url-security.mjs";

for (const address of [
  "127.0.0.1", "10.0.0.1", "172.16.0.1", "192.168.1.1",
  "169.254.169.254", "100.64.0.1", "::1", "fc00::1", "fe80::1",
  "ff02::1", "2001:db8::1", "::ffff:127.0.0.1",
]) assert.equal(isPublicAddress(address), false, `Expected private/reserved address to be rejected: ${address}`);

for (const address of ["1.1.1.1", "8.8.8.8", "2606:4700:4700::1111"]) {
  assert.equal(isPublicAddress(address), true, `Expected public address to be accepted: ${address}`);
}

for (const url of [
  "http://example.com/video.mp4",
  "https://127.0.0.1/video.mp4",
  "https://169.254.169.254/latest/meta-data",
  "https://localhost/video.mp4",
  "https://service.local/video.mp4",
  "https://user:pass@example.com/video.mp4",
  "https://example.com:8443/video.mp4",
]) await assert.rejects(() => assertSafeMediaUrl(url));

console.log("Fresh media worker URL safety tests: PASS");
