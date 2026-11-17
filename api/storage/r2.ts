import { createClient } from "@supabase/supabase-js";
import { createVercelNodeHandler } from "../../src/server/vercelNodeAdapter.js";
import {
  buildR2ObjectKey,
  isOwnedR2Key,
  presignR2Request,
  signR2Request,
} from "../../src/server/storage/r2S3Signer.mjs";

export const config = { maxDuration: 30 };

const MAX_OBJECT_BYTES = 5_000_000_000;
const PART_BYTES = 64 * 1024 * 1024;
const MIN_PART_BYTES = 5 * 1024 * 1024;
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "cache-control": "no-store" } });

function storageConfig() {
  const value = {
    accountId: process.env.R2_ACCOUNT_ID || "",
    bucket: process.env.R2_BUCKET || "",
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  };
  return Object.values(value).every(Boolean) ? value : null;
}

async function authenticate(request: Request) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!url || !key || !token) return null;
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.getUser(token);
  return error ? null : data.user ?? null;
}

function xmlEscape(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

async function r2Fetch(config: NonNullable<ReturnType<typeof storageConfig>>, options: {
  method: string; key: string; query?: Record<string, string | number>;
  headers?: Record<string, string>; body?: string;
}) {
  const signed = signR2Request(config, options);
  return fetch(signed.url, { method: options.method, headers: signed.headers, body: options.body });
}

function parseUploadId(xml: string) {
  return xml.match(/<UploadId>([^<]+)<\/UploadId>/)?.[1] ?? null;
}

function safeParts(value: unknown) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 1000) return null;
  const parts: Array<{ PartNumber: number; ETag: string }> = [];
  for (const item of value) {
    if (!item || !Number.isInteger(item.PartNumber) || item.PartNumber < 1 || item.PartNumber > 1000 ||
        typeof item.ETag !== "string" || !/^"?[a-f0-9]{32}(?:-\d+)?"?$/i.test(item.ETag)) return null;
    parts.push({ PartNumber: item.PartNumber, ETag: item.ETag });
  }
  parts.sort((a, b) => a.PartNumber - b.PartNumber);
  if (parts.some((part, index) => part.PartNumber !== index + 1)) return null;
  return parts;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const user = await authenticate(request);
    if (!user) return json({ error: "Authentication required" }, 401);
    const r2 = storageConfig();
    if (!r2) return json({ error: "Expandable storage is not configured. R2 credentials must be added to the server environment." }, 503);

    let body: Record<string, unknown>;
    try { body = await request.json() as Record<string, unknown>; }
    catch { return json({ error: "A valid JSON body is required" }, 400); }

    const action = body.action;
    if (action === "initiate") {
      const sizeBytes = Number(body.sizeBytes);
      if (!Number.isSafeInteger(sizeBytes) || sizeBytes <= 0 || sizeBytes > MAX_OBJECT_BYTES) {
        return json({ error: "Object size must be between 1 byte and 5,000,000,000 bytes." }, 413);
      }
      const contentType = typeof body.contentType === "string" && /^[\w.+-]+\/[\w.+-]+$/.test(body.contentType)
        ? body.contentType.slice(0, 120) : "application/octet-stream";
      const extension = typeof body.extension === "string" ? body.extension : "bin";
      const key = buildR2ObjectKey(user.id, extension, crypto.randomUUID());
      const create = await r2Fetch(r2, {
        method: "POST", key, query: { uploads: "" },
        headers: {
          "content-type": contentType,
          "x-amz-meta-owner-id": user.id,
          "x-amz-meta-expected-size": String(sizeBytes),
        },
      });
      const xml = await create.text();
      if (!create.ok) return json({ error: "Storage provider could not initiate multipart upload", providerStatus: create.status }, 502);
      const uploadId = parseUploadId(xml);
      if (!uploadId) return json({ error: "Storage provider returned an invalid multipart session" }, 502);
      return json({ key, uploadId, partSizeBytes: PART_BYTES, partCount: Math.ceil(sizeBytes / PART_BYTES), maxObjectBytes: MAX_OBJECT_BYTES }, 201);
    }

    const key = typeof body.key === "string" ? body.key : "";
    const uploadId = typeof body.uploadId === "string" ? body.uploadId : "";
    if (!isOwnedR2Key(key, user.id)) return json({ error: "Object access denied" }, 403);

    if (action === "sign-part") {
      const partNumber = Number(body.partNumber);
      if (!uploadId || !Number.isInteger(partNumber) || partNumber < 1 || partNumber > 1000) {
        return json({ error: "Invalid multipart part request" }, 400);
      }
      const url = presignR2Request(r2, {
        method: "PUT", key, query: { partNumber, uploadId }, expiresIn: 900,
      });
      return json({ url, partNumber, expiresIn: 900 });
    }

    if (action === "complete") {
      if (!uploadId) return json({ error: "Upload session is required" }, 400);
      const parts = safeParts(body.parts);
      if (!parts) return json({ error: "Multipart parts are invalid or incomplete" }, 400);
      const xml = `<CompleteMultipartUpload>${parts.map((part) =>
        `<Part><PartNumber>${part.PartNumber}</PartNumber><ETag>${xmlEscape(part.ETag)}</ETag></Part>`,
      ).join("")}</CompleteMultipartUpload>`;
      const complete = await r2Fetch(r2, {
        method: "POST", key, query: { uploadId }, headers: { "content-type": "application/xml" }, body: xml,
      });
      const result = await complete.text();
      if (!complete.ok || /<Error>/.test(result)) return json({ error: "Storage provider could not complete the upload" }, 502);
      const head = await r2Fetch(r2, { method: "HEAD", key });
      if (!head.ok) return json({ error: "Uploaded object could not be verified" }, 502);
      const actualSize = Number(head.headers.get("content-length"));
      const owner = head.headers.get("x-amz-meta-owner-id");
      const expectedSize = Number(head.headers.get("x-amz-meta-expected-size"));
      if (owner !== user.id || !Number.isSafeInteger(actualSize) || actualSize !== expectedSize || actualSize <= 0 || actualSize > MAX_OBJECT_BYTES) {
        return json({ error: "Uploaded object failed ownership or size verification" }, 409);
      }
      return json({ key, sizeBytes: actualSize, contentType: head.headers.get("content-type") || "application/octet-stream", verified: true }, 200);
    }

    if (action === "abort") {
      if (!uploadId) return json({ error: "Upload session is required" }, 400);
      const aborted = await r2Fetch(r2, { method: "DELETE", key, query: { uploadId } });
      if (!aborted.ok && aborted.status !== 404) return json({ error: "Storage provider could not abort the upload" }, 502);
      return json({ aborted: true });
    }

    if (action === "download") {
      const url = presignR2Request(r2, { method: "GET", key, expiresIn: 300 });
      return json({ url, expiresIn: 300 });
    }

    return json({ error: "Unsupported storage action" }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Storage request failed" }, 500);
  }
}

export default createVercelNodeHandler({ POST });
