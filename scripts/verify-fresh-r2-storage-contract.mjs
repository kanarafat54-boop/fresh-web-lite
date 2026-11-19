import assert from "node:assert/strict";
import {
  buildR2ObjectKey,
  isOwnedR2Key,
  presignR2Request,
  signR2Request,
} from "../src/server/storage/r2S3Signer.mjs";

const config = {
  accountId: "0123456789abcdef0123456789abcdef",
  bucket: "fresh-media",
  accessKeyId: "TESTACCESSKEY",
  secretAccessKey: "test-secret-not-real",
};
const now = new Date("2026-11-17T09:00:00.000Z");
const key = buildR2ObjectKey("12345678-1234-1234-1234-123456789abc", "mp4", "video_01");
assert.equal(key, "12345678-1234-1234-1234-123456789abc/video_01.mp4");
assert.equal(isOwnedR2Key(key, "12345678-1234-1234-1234-123456789abc"), true);
assert.equal(isOwnedR2Key(key, "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"), false);
assert.equal(isOwnedR2Key("../other-user/file.mp4", "12345678-1234-1234-1234-123456789abc"), false);

const putUrl = presignR2Request(config, { method: "PUT", key, query: { partNumber: 1, uploadId: "opaque-upload-id" }, expiresIn: 900, now });
const parsed = new URL(putUrl);
assert.equal(parsed.hostname, "0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com");
assert.equal(parsed.searchParams.get("X-Amz-Algorithm"), "AWS4-HMAC-SHA256");
assert.equal(parsed.searchParams.get("X-Amz-Expires"), "900");
assert.equal(parsed.searchParams.get("partNumber"), "1");
assert.equal(parsed.searchParams.get("uploadId"), "opaque-upload-id");
assert.match(parsed.searchParams.get("X-Amz-Signature") || "", /^[a-f0-9]{64}$/);
assert.equal(putUrl.includes(config.secretAccessKey), false);
assert.throws(() => presignR2Request(config, { method: "GET", key, expiresIn: 604801, now }), /between 1 second and 7 days/);

const signed = signR2Request(config, { method: "POST", key, query: { uploads: "" }, body: "", now });
assert.match(signed.headers.authorization, /^AWS4-HMAC-SHA256 Credential=TESTACCESSKEY\//);
assert.equal(new URL(signed.url).hostname, "0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com");
assert.equal(signed.headers.host, undefined);
assert.match(signed.headers.authorization, /SignedHeaders=host;x-amz-content-sha256;x-amz-date/);
assert.equal(signed.url.includes("uploads="), true);
assert.equal(signed.headers.authorization.includes(config.secretAccessKey), false);

console.log("Fresh R2 S3 signer and ownership contracts: PASS");
