import { supabase, supabaseAnonKey, supabaseUrl } from "../../../lib/supabase";

const BUCKET = "post-videos";
const MAX_VIDEO_BYTES = 5_000_000_000;
const TUS_CHUNK_BYTES = 6 * 1024 * 1024;
const TUS_VERSION = "1.0.0";

type UploadSession = { uploadUrl: string; objectPath: string };
type ProgressCallback = (percent: number) => void;

function encodeMetadata(value: string): string {
  return btoa(value);
}

function getPublicApiKey(): string {
  if (!supabaseAnonKey) throw new Error("Supabase public API configuration is missing. Refresh Fresh Web Lite and retry.");
  return supabaseAnonKey;
}

function storageUploadEndpoint(): string {
  if (!supabaseUrl) throw new Error("Supabase project URL is missing. Refresh Fresh Web Lite and retry.");
  const projectUrl = new URL(supabaseUrl);
  if (projectUrl.hostname.endsWith(".supabase.co")) {
    projectUrl.hostname = projectUrl.hostname.replace(".supabase.co", ".storage.supabase.co");
  }
  return new URL("/storage/v1/upload/resumable", projectUrl.origin).toString();
}

function sessionKey(userId: string, file: File): string {
  return `fresh-long-video-tus:${userId}:${file.name}:${file.size}:${file.lastModified}`;
}

function readSession(key: string): UploadSession | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(key) || "null") as UploadSession | null;
    return value && typeof value.uploadUrl === "string" && typeof value.objectPath === "string" ? value : null;
  } catch {
    return null;
  }
}

function writeSession(key: string, value: UploadSession): void {
  try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* session recovery is best-effort */ }
}

function clearSession(key: string): void {
  try { sessionStorage.removeItem(key); } catch { /* ignore unavailable session storage */ }
}

async function responseError(response: Response, action: string): Promise<Error> {
  const detail = await response.text().catch(() => "");
  if (response.status === 413 || /file.?size|upload.?size|too large|maximum.*size/i.test(detail)) {
    return new Error("Fresh Flow supports one video up to 5 GB, but the connected storage project rejected this file because its global or bucket upload limit is lower. The storage limit must support this file size before the upload can continue.");
  }
  return new Error(`Video upload ${action} failed (${response.status}). ${detail.slice(0, 240)}`.trim());
}

async function advertisedTusMaxSize(endpoint: string, accessToken: string): Promise<number | null> {
  const response = await fetch(endpoint, {
    method: "OPTIONS",
    headers: { authorization: `Bearer ${accessToken}`, apikey: getPublicApiKey(), "Tus-Resumable": TUS_VERSION },
  });
  if (!response.ok) return null;
  const raw = response.headers.get("Tus-Max-Size");
  if (!raw) return null;
  const limit = Number(raw);
  return Number.isSafeInteger(limit) && limit >= 0 ? limit : null;
}

async function createSession(
  endpoint: string,
  accessToken: string,
  file: File,
  objectPath: string,
): Promise<UploadSession> {
  const metadata = [
    `bucketName ${encodeMetadata(BUCKET)}`,
    `objectName ${encodeMetadata(objectPath)}`,
    `contentType ${encodeMetadata(file.type)}`,
    `cacheControl ${encodeMetadata("3600")}`,
  ].join(",");
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      apikey: getPublicApiKey(),
      "Tus-Resumable": TUS_VERSION,
      "Upload-Length": String(file.size),
      "Upload-Metadata": metadata,
      "x-upsert": "false",
    },
  });
  if (!response.ok) throw await responseError(response, "session creation");
  const location = response.headers.get("Location");
  if (!location) throw new Error("Video upload server did not return a resumable upload URL.");
  return { uploadUrl: new URL(location, endpoint).toString(), objectPath };
}

async function readOffset(uploadUrl: string, accessToken: string): Promise<number> {
  const response = await fetch(uploadUrl, {
    method: "HEAD",
    headers: {
      authorization: `Bearer ${accessToken}`,
      apikey: getPublicApiKey(),
      "Tus-Resumable": TUS_VERSION,
    },
  });
  if (!response.ok) throw await responseError(response, "resume check");
  const offset = Number(response.headers.get("Upload-Offset"));
  if (!Number.isFinite(offset) || offset < 0) throw new Error("Video upload server returned an invalid resume offset.");
  return offset;
}

async function patchChunk(
  uploadUrl: string,
  accessToken: string,
  file: File,
  offset: number,
): Promise<number> {
  const chunk = file.slice(offset, Math.min(offset + TUS_CHUNK_BYTES, file.size));
  const response = await fetch(uploadUrl, {
    method: "PATCH",
    headers: {
      authorization: `Bearer ${accessToken}`,
      apikey: getPublicApiKey(),
      "Tus-Resumable": TUS_VERSION,
      "Upload-Offset": String(offset),
      "Content-Type": "application/offset+octet-stream",
    },
    body: chunk,
  });
  if (response.status === 409) return readOffset(uploadUrl, accessToken);
  if (!response.ok) throw await responseError(response, "chunk transfer");
  const nextOffset = Number(response.headers.get("Upload-Offset"));
  if (!Number.isFinite(nextOffset) || nextOffset <= offset) {
    throw new Error("Video upload did not advance. Retry the same file to resume.");
  }
  return nextOffset;
}

/**
 * Uploads a Long Video using Supabase Storage's TUS protocol.
 * Product limit: 5,000,000,000 bytes per video. The storage provider still
 * enforces global and bucket limits; TUS preflight checks its advertised ceiling.
 */
export async function uploadLongVideoResumable(
  userId: string,
  file: File,
  onProgress?: ProgressCallback,
): Promise<{ url: string; path: string }> {
  if (!userId) throw new Error("Sign in with Fresh ID before uploading a Long Video.");
  if (!["video/mp4", "video/webm", "video/quicktime"].includes(file.type)) throw new Error("Use an MP4, WebM, or QuickTime video.");
  if (file.size <= 0) throw new Error("The selected video is empty.");
  if (file.size > MAX_VIDEO_BYTES) {
    throw new Error("A single Fresh Flow Long Video can be up to 5 GB (5,000,000,000 bytes). Choose a smaller file to continue.");
  }

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session?.access_token) throw new Error("Your Fresh ID session expired. Sign in again and retry the upload.");

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120) || "video.mp4";
  const key = sessionKey(userId, file);
  const endpoint = storageUploadEndpoint();
  let current = readSession(key);

  if (current) {
    try {
      await readOffset(current.uploadUrl, session.access_token);
    } catch (error) {
      if (error instanceof Error && /\(404\)|\(410\)/.test(error.message)) {
        clearSession(key);
        current = null;
      } else {
        throw error;
      }
    }
  }

  if (!current) {
    const serverLimit = await advertisedTusMaxSize(endpoint, session.access_token);
    if (serverLimit !== null && file.size > serverLimit) {
      const limitMb = Math.max(1, Math.floor(serverLimit / (1024 * 1024)));
      throw new Error(`This video is larger than the connected storage server currently allows (about ${limitMb} MiB). Fresh Flow supports one video up to 5 GB, but the storage global/bucket limit must be raised before this file can upload.`);
    }
    const objectPath = `${userId}/long-video-${crypto.randomUUID()}-${safeName}`;
    current = await createSession(endpoint, session.access_token, file, objectPath);
    writeSession(key, current);
  }

  let offset = await readOffset(current.uploadUrl, session.access_token);
  if (offset > file.size) {
    clearSession(key);
    throw new Error("The saved upload session does not match this file. Select the video again to start a fresh upload.");
  }
  onProgress?.(Math.round((offset / file.size) * 100));

  while (offset < file.size) {
    let nextOffset = offset;
    let lastError: unknown = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        nextOffset = await patchChunk(current.uploadUrl, session.access_token, file, offset);
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
        if (attempt < 2) {
          await new Promise((resolve) => window.setTimeout(resolve, 800 * (attempt + 1)));
          try {
            const serverOffset = await readOffset(current.uploadUrl, session.access_token);
            if (serverOffset > offset) { nextOffset = serverOffset; lastError = null; break; }
          } catch { /* retry the chunk */ }
        }
      }
    }
    if (lastError) throw lastError instanceof Error ? lastError : new Error("Long Video upload failed. Retry the same file to resume.");
    if (nextOffset <= offset) throw new Error("Long Video upload could not advance. Retry the same file to resume.");
    offset = nextOffset;
    onProgress?.(Math.min(100, Math.round((offset / file.size) * 100)));
  }

  clearSession(key);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(current.objectPath);
  return { url: data.publicUrl, path: current.objectPath };
}
