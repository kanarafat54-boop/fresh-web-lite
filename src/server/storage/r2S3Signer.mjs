import { createHash, createHmac } from "node:crypto";

const SERVICE = "s3";
const REGION = "auto";
const ALGORITHM = "AWS4-HMAC-SHA256";

function encode(value) {
  return encodeURIComponent(String(value)).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function canonicalPath(bucket, key) {
  return `/${encode(bucket)}/${String(key).split("/").map(encode).join("/")}`;
}

function canonicalQuery(query) {
  return Object.entries(query)
    .flatMap(([key, value]) => (Array.isArray(value) ? value : [value]).map((item) => [encode(key), encode(item ?? "")]))
    .sort(([aKey, aValue], [bKey, bValue]) => aKey.localeCompare(bKey) || aValue.localeCompare(bValue))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function hmac(key, value, encoding) {
  return createHmac("sha256", key).update(value).digest(encoding);
}

function signingKey(secret, dateStamp) {
  const dateKey = hmac(`AWS4${secret}`, dateStamp);
  const regionKey = hmac(dateKey, REGION);
  const serviceKey = hmac(regionKey, SERVICE);
  return hmac(serviceKey, "aws4_request");
}

function timestamp(date) {
  return date.toISOString().replace(/[:-]|.\d{3}/g, "");
}

function validateConfig(config) {
  for (const key of ["accountId", "bucket", "accessKeyId", "secretAccessKey"]) {
    if (typeof config?.[key] !== "string" || !config[key].trim()) {
      throw new Error(`R2 configuration is missing ${key}.`);
    }
  }
}

function endpoint(config) {
  return `https://${config.accountId}.r2.cloudflarestorage.com`;
}

/** Signs a server-to-R2 S3 API request using AWS Signature Version 4. */
export function signR2Request(config, options) {
  validateConfig(config);
  const now = options.now ?? new Date();
  const amzDate = timestamp(now);
  const dateStamp = amzDate.slice(0, 8);
  const host = `${config.accountId}.r2.cloudflarestorage.com`;
  const path = canonicalPath(config.bucket, options.key);
  const query = canonicalQuery(options.query ?? {});
  const body = options.body ?? "";
  const payloadHash = sha256(body);
  const suppliedHeaders = Object.fromEntries(
    Object.entries(options.headers ?? {}).map(([key, value]) => [key.toLowerCase(), String(value).trim()]),
  );
  const headers = {
    ...suppliedHeaders,
    host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };
  const signedHeaders = Object.keys(headers).sort().join(";");
  const canonicalHeaders = Object.keys(headers).sort().map((key) => `${key}:${headers[key].replace(/\s+/g, " ")}\n`).join("");
  const canonicalRequest = [
    options.method.toUpperCase(),
    path,
    query,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const scope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`;
  const stringToSign = [ALGORITHM, amzDate, scope, sha256(canonicalRequest)].join("\n");
  const signature = hmac(signingKey(config.secretAccessKey, dateStamp), stringToSign, "hex");
  const authorization = `${ALGORITHM} Credential=${config.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  return {
    url: `${endpoint(config)}${path}${query ? `?${query}` : ""}`,
    headers: { ...headers, authorization },
  };
}

/** Creates a short-lived URL for one object operation; secret keys never leave the server. */
export function presignR2Request(config, options) {
  validateConfig(config);
  const expiresIn = options.expiresIn ?? 600;
  if (!Number.isInteger(expiresIn) || expiresIn < 1 || expiresIn > 604800) {
    throw new TypeError("R2 presigned URL expiry must be between 1 second and 7 days.");
  }
  const now = options.now ?? new Date();
  const amzDate = timestamp(now);
  const dateStamp = amzDate.slice(0, 8);
  const host = `${config.accountId}.r2.cloudflarestorage.com`;
  const path = canonicalPath(config.bucket, options.key);
  const scope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`;
  const query = canonicalQuery({
    ...(options.query ?? {}),
    "X-Amz-Algorithm": ALGORITHM,
    "X-Amz-Credential": `${config.accessKeyId}/${scope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expiresIn),
    "X-Amz-SignedHeaders": "host",
  });
  const canonicalRequest = [
    options.method.toUpperCase(),
    path,
    query,
    `host:${host}\n`,
    "host",
    "UNSIGNED-PAYLOAD",
  ].join("\n");
  const stringToSign = [ALGORITHM, amzDate, scope, sha256(canonicalRequest)].join("\n");
  const signature = hmac(signingKey(config.secretAccessKey, dateStamp), stringToSign, "hex");
  return `${endpoint(config)}${path}?${query}&X-Amz-Signature=${signature}`;
}

export function buildR2ObjectKey(userId, extension = "bin", id = "object") {
  if (typeof userId !== "string" || !/^[0-9a-f-]{16,64}$/i.test(userId)) {
    throw new TypeError("A valid authenticated user ID is required.");
  }
  const safeExtension = String(extension).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12) || "bin";
  const safeId = String(id).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) || "object";
  return `${userId}/${safeId}.${safeExtension}`;
}

export function isOwnedR2Key(key, userId) {
  return typeof key === "string" && typeof userId === "string" &&
    key.startsWith(`${userId}/`) && !key.includes("\\") &&
    !key.split("/").some((segment) => segment === "." || segment === "..");
}
