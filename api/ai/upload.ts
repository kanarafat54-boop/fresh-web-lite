import { createVercelNodeHandler } from "../../src/server/vercelNodeAdapter.js";
import { createClient } from "@supabase/supabase-js";
import { persistFreshAIMedia } from "../../src/core/fresh-ai/FreshAIServerServices.js";
import {
  buildR2ObjectKey,
  isOwnedR2Key,
  presignR2Request,
  signR2Request,
} from "../../src/server/storage/r2S3Signer.mjs";

export const config = { maxDuration: 30 };
const MAX_BYTES = 20 * 1024 * 1024;
const MAX_R2_OBJECT_BYTES = 5_000_000_000;
const R2_PART_BYTES = 64 * 1024 * 1024;
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "cache-control": "no-store" } });

async function authenticatedUser(req: Request) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!url || !key || !token) return null;
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const result = await client.auth.getUser(token);
  return result.data.user ?? null;
}

function r2StorageConfig() {
  const value = {
    accountId: process.env.R2_ACCOUNT_ID || "",
    bucket: process.env.R2_BUCKET || "",
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  };
  return Object.values(value).every(Boolean) ? value : null;
}

function xmlEscape(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

async function r2Fetch(config: NonNullable<ReturnType<typeof r2StorageConfig>>, options: {
  method: string; key: string; query?: Record<string, string | number>;
  headers?: Record<string, string>; body?: string;
}) {
  const signed = signR2Request(config, options);
  return fetch(signed.url, { method: options.method, headers: signed.headers, body: options.body });
}

function parseUploadId(xml: string) {
  return xml.match(/<UploadId>([^<]+)<\/UploadId>/)?.[1] ?? null;
}

function safeR2Parts(value: unknown) {
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

async function handleR2Upload(req: Request, userId: string): Promise<Response> {
  const r2 = r2StorageConfig();
  if (!r2) return json({ error: "Expandable storage is not configured. R2 credentials must be added to the server environment." }, 503);
  let body: Record<string, unknown>;
  try { body = await req.json() as Record<string, unknown>; }
  catch { return json({ error: "A valid JSON body is required" }, 400); }

  const action = body.action;
  if (action === "initiate") {
    const sizeBytes = Number(body.sizeBytes);
    if (!Number.isSafeInteger(sizeBytes) || sizeBytes <= 0 || sizeBytes > MAX_R2_OBJECT_BYTES) {
      return json({ error: "Object size must be between 1 byte and 5,000,000,000 bytes." }, 413);
    }
    const contentType = typeof body.contentType === "string" && /^[\w.+-]+\/[\w.+-]+$/.test(body.contentType)
      ? body.contentType.slice(0, 120) : "application/octet-stream";
    const extension = typeof body.extension === "string" ? body.extension : "bin";
    const key = buildR2ObjectKey(userId, extension, crypto.randomUUID());
    const create = await r2Fetch(r2, {
      method: "POST", key, query: { uploads: "" },
      headers: {
        "content-type": contentType,
        "x-amz-meta-owner-id": userId,
        "x-amz-meta-expected-size": String(sizeBytes),
      },
    });
    const xml = await create.text();
    if (!create.ok) return json({ error: "Storage provider could not initiate multipart upload", providerStatus: create.status }, 502);
    const uploadId = parseUploadId(xml);
    if (!uploadId) return json({ error: "Storage provider returned an invalid multipart session" }, 502);
    return json({ key, uploadId, partSizeBytes: R2_PART_BYTES, partCount: Math.ceil(sizeBytes / R2_PART_BYTES), maxObjectBytes: MAX_R2_OBJECT_BYTES }, 201);
  }

  const key = typeof body.key === "string" ? body.key : "";
  const uploadId = typeof body.uploadId === "string" ? body.uploadId : "";
  if (!isOwnedR2Key(key, userId)) return json({ error: "Object access denied" }, 403);

  if (action === "list-parts") {
    if (!uploadId || uploadId.length > 2048) return json({ error: "Upload session is invalid" }, 400);
    const listed = await r2Fetch(r2, { method: "GET", key, query: { uploadId } });
    const xml = await listed.text();
    if (!listed.ok) return json({ error: "Could not inspect the resumable upload" }, listed.status === 404 ? 404 : 502);
    const parts = [...xml.matchAll(/<Part>([\s\S]*?)<\/Part>/g)].map((match) => {
      const part = match[1];
      const partNumber = Number(part.match(/<PartNumber>(\d+)<\/PartNumber>/)?.[1]);
      const etag = part.match(/<ETag>([^<]+)<\/ETag>/)?.[1];
      const sizeBytes = Number(part.match(/<Size>(\d+)<\/Size>/)?.[1]);
      return { partNumber, etag, sizeBytes };
    }).filter((part) => Number.isInteger(part.partNumber) && part.partNumber > 0 &&
      typeof part.etag === "string" && /^"?[a-f0-9]{32}(?:-\d+)?"?$/i.test(part.etag) &&
      Number.isSafeInteger(part.sizeBytes) && part.sizeBytes > 0);
    return json({ parts });
  }

  if (action === "sign-part") {
    const partNumber = Number(body.partNumber);
    if (!uploadId || uploadId.length > 2048 || !Number.isInteger(partNumber) || partNumber < 1 || partNumber > 1000) {
      return json({ error: "Invalid multipart part request" }, 400);
    }
    const url = presignR2Request(r2, { method: "PUT", key, query: { partNumber, uploadId }, expiresIn: 900 });
    return json({ url, partNumber, expiresIn: 900 });
  }

  if (action === "complete") {
    if (!uploadId || uploadId.length > 2048) return json({ error: "Upload session is required" }, 400);
    const parts = safeR2Parts(body.parts);
    const expectedBytes = Number(body.sizeBytes);
    if (!parts || !Number.isSafeInteger(expectedBytes) || expectedBytes <= 0 || expectedBytes > MAX_R2_OBJECT_BYTES) {
      return json({ error: "Multipart parts or expected object size are invalid" }, 400);
    }
    const listed = await r2Fetch(r2, { method: "GET", key, query: { uploadId } });
    const listedXml = await listed.text();
    if (!listed.ok) return json({ error: "Could not verify uploaded multipart parts" }, 409);
    const actualParts = [...listedXml.matchAll(/<Part>([\s\S]*?)<\/Part>/g)].map((match) => {
      const partXml = match[1];
      return {
        partNumber: Number(partXml.match(/<PartNumber>(\d+)<\/PartNumber>/)?.[1]),
        etag: partXml.match(/<ETag>([^<]+)<\/ETag>/)?.[1],
        sizeBytes: Number(partXml.match(/<Size>(\d+)<\/Size>/)?.[1]),
      };
    });
    const actualBytes = actualParts.reduce((sum, part) => sum + (Number.isSafeInteger(part.sizeBytes) ? part.sizeBytes : 0), 0);
    const partsMatch = actualParts.length === parts.length && parts.every((part, index) =>
      actualParts[index]?.partNumber === part.PartNumber &&
      actualParts[index]?.etag === part.ETag &&
      Number.isSafeInteger(actualParts[index]?.sizeBytes) && actualParts[index].sizeBytes > 0,
    );
    if (!partsMatch || actualBytes !== expectedBytes) {
      return json({ error: "Uploaded parts do not match the expected object size or manifest" }, 409);
    }
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
    if (owner !== userId || !Number.isSafeInteger(actualSize) || actualSize !== expectedSize || actualSize !== expectedBytes || actualSize <= 0 || actualSize > MAX_R2_OBJECT_BYTES) {
      return json({ error: "Uploaded object failed ownership or size verification" }, 409);
    }
    return json({ key, sizeBytes: actualSize, contentType: head.headers.get("content-type") || "application/octet-stream", verified: true });
  }

  if (action === "abort") {
    if (!uploadId || uploadId.length > 2048) return json({ error: "Upload session is required" }, 400);
    const aborted = await r2Fetch(r2, { method: "DELETE", key, query: { uploadId } });
    if (!aborted.ok && aborted.status !== 404) return json({ error: "Storage provider could not abort the upload" }, 502);
    return json({ aborted: true });
  }

  if (action === "download") {
    const url = presignR2Request(r2, { method: "GET", key, expiresIn: 300 });
    return json({ url, expiresIn: 300 });
  }

  return json({ error: "Unsupported storage action" }, 400);
}

export async function POST(req: Request): Promise<Response> {
  try {
    const user = await authenticatedUser(req);
    if (!user) return json({ error: "Authentication required" }, 401);
    if (req.headers.get("content-type")?.includes("application/json")) {
      return handleR2Upload(req, user.id);
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return json({ error: "A file is required" }, 400);
    if (file.size <= 0) return json({ error: "The file is empty" }, 400);
    if (file.size > MAX_BYTES) return json({ error: "Files must be 20 MB or smaller" }, 413);

    const bytes = Buffer.from(await file.arrayBuffer());
    const requestId = crypto.randomUUID();
    const mimeType = file.type || "application/octet-stream";
    const isSupportedImage = ["image/png", "image/jpeg", "image/webp"].includes(mimeType);
    const stored = await persistFreshAIMedia({
      userId: user.id,
      requestId,
      kind: isSupportedImage ? "image" : "file",
      b64: bytes.toString("base64"),
      mimeType,
      metadata: { originalName: file.name, size: file.size, ...(isSupportedImage ? { observationSource: "user-upload", capturedAt: new Date().toISOString() } : {}) },
    });

    return json({
      asset: {
        id: stored.id,
        name: file.name,
        mimeType,
        size: file.size,
        bucket: stored.bucket,
        path: stored.path,
        url: stored.signedUrl,
      },
    }, 201);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unable to upload file" }, 500);
  }
}

export default createVercelNodeHandler({ POST });
