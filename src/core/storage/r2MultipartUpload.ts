export interface FreshR2UploadResult {
  key: string;
  sizeBytes: number;
  contentType: string;
  verified: true;
}
type StoredSession = { key: string; uploadId: string };
type ListedPart = { partNumber: number; etag: string; sizeBytes: number };
type ApiResponse = Record<string, unknown>;

const API_PATH = "/api/ai/upload";
const PART_BYTES = 64 * 1024 * 1024;

async function callApi(accessToken: string, payload: Record<string, unknown>, apiPath = API_PATH): Promise<ApiResponse> {
  const response = await fetch(apiPath, {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({})) as ApiResponse;
  if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : `Storage request failed (${response.status}).`);
  return result;
}

function sessionKey(file: File, userId: string): string {
  return `fresh-r2-upload:${userId}:${file.name}:${file.size}:${file.lastModified}:${file.type}`;
}

function readSession(key: string): StoredSession | null {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null") as StoredSession | null;
    return value && typeof value.key === "string" && typeof value.uploadId === "string" ? value : null;
  } catch {
    return null;
  }
}

function writeSession(key: string, session: StoredSession): void {
  try { localStorage.setItem(key, JSON.stringify(session)); } catch { /* resume is best-effort */ }
}

function clearSession(key: string): void {
  try { localStorage.removeItem(key); } catch { /* ignore unavailable local storage */ }
}

async function uploadPart(url: string, chunk: Blob): Promise<string> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, { method: "PUT", body: chunk });
      if (!response.ok) throw new Error(`Storage part upload failed (${response.status}).`);
      const etag = response.headers.get("etag");
      if (!etag || !/^"?[a-f0-9]{32}(?:-\d+)?"?$/i.test(etag)) {
        throw new Error("Storage CORS must expose the ETag response header before uploads can complete.");
      }
      return etag;
    } catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise((resolve) => window.setTimeout(resolve, 700 * (attempt + 1)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Storage part upload failed.");
}

/**
 * Uploads directly to private R2 storage in resumable 64 MiB parts.
 * R2 credentials remain server-side; the browser receives one short-lived URL per part.
 */
export async function uploadFreshR2Object(
  file: File,
  accessToken: string,
  userId: string,
  onProgress?: (percent: number) => void,
): Promise<FreshR2UploadResult> {
  if (!accessToken || !userId) throw new Error("Sign in with Fresh ID before uploading.");
  if (!(file instanceof File) || file.size <= 0 || file.size > 5_000_000_000) {
    throw new Error("Choose a non-empty file no larger than 5 GB.");
  }

  const localKey = sessionKey(file, userId);
  let session = readSession(localKey);
  if (!session) {
    const extension = file.name.includes(".") ? file.name.split(".").pop() || "bin" : "bin";
    const created = await callApi(accessToken, {
      action: "initiate", sizeBytes: file.size, contentType: file.type || "application/octet-stream", extension,
    });
    if (typeof created.key !== "string" || typeof created.uploadId !== "string") {
      throw new Error("Storage provider did not return a valid upload session.");
    }
    session = { key: created.key, uploadId: created.uploadId };
    writeSession(localKey, session);
  }

  try {
    const listed = await callApi(accessToken, { action: "list-parts", ...session });
    const remoteParts = Array.isArray(listed.parts) ? listed.parts as ListedPart[] : [];
    const completed = new Map(remoteParts.map((part) => [part.partNumber, part]));
    const partCount = Math.ceil(file.size / PART_BYTES);
    let uploadedBytes = 0;
    const parts: Array<{ PartNumber: number; ETag: string }> = [];

    for (let partNumber = 1; partNumber <= partCount; partNumber += 1) {
      const start = (partNumber - 1) * PART_BYTES;
      const end = Math.min(start + PART_BYTES, file.size);
      const chunk = file.slice(start, end);
      const existing = completed.get(partNumber);
      let etag: string;

      if (existing && existing.sizeBytes === chunk.size) {
        etag = existing.etag;
      } else {
        const signed = await callApi(accessToken, { action: "sign-part", ...session, partNumber });
        if (typeof signed.url !== "string") throw new Error("Storage provider did not return a part upload URL.");
        etag = await uploadPart(signed.url, chunk);
      }
      parts.push({ PartNumber: partNumber, ETag: etag });
      uploadedBytes += chunk.size;
      onProgress?.(Math.round((uploadedBytes / file.size) * 100));
    }

    const completedResult = await callApi(accessToken, { action: "complete", ...session, parts, sizeBytes: file.size });
    if (completedResult.verified !== true || completedResult.sizeBytes !== file.size || typeof completedResult.key !== "string") {
      throw new Error("Storage provider did not verify the completed object.");
    }
    clearSession(localKey);
    return completedResult as unknown as FreshR2UploadResult;
  } catch (error) {
    // Preserve the session so retrying the same selected file can resume completed parts.
    throw error;
  }
}

export async function createFreshR2DownloadUrl(key: string, accessToken: string): Promise<string> {
  const result = await callApi(accessToken, { action: "download", key });
  if (typeof result.url !== "string") throw new Error("Storage provider did not return a download URL.");
  return result.url;
}
