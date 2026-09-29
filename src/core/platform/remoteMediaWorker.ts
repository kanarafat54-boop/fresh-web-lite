export type RemoteMediaWorkerJob = {
  inputUrl: string;
  outputFormat?: "webm" | "mp4";
  maxSeconds?: number;
};

export type RemoteMediaWorkerAccepted = {
  jobId: string;
  status: "queued";
  statusUrl: string;
};

export type RemoteMediaWorkerStatus = {
  jobId?: string;
  status: "queued" | "running" | "succeeded" | "failed";
  outputUrl?: string | null;
  outputBytes?: number;
  error?: string;
};

function baseUrl(): string | null {
  const value = import.meta.env.VITE_FRESH_MEDIA_WORKER_URL?.trim();
  return value ? value.replace(/\/$/, "") : null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const base = baseUrl();
  if (!base) throw new Error("Fresh media worker is not configured.");
  const response = await fetch(base + path, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const payload = (await response.json().catch(() => ({}))) as { error?: string } & T;
  if (!response.ok) throw new Error(payload.error ?? "Fresh media worker request failed.");
  return payload;
}

export function isRemoteMediaWorkerConfigured(): boolean {
  return Boolean(baseUrl());
}

export async function submitRemoteMediaJob(job: RemoteMediaWorkerJob) {
  return request<RemoteMediaWorkerAccepted>("/jobs", {
    method: "POST",
    body: JSON.stringify(job),
  });
}

export async function getRemoteMediaJob(jobId: string) {
  return request<RemoteMediaWorkerStatus>("/jobs/" + encodeURIComponent(jobId), { method: "GET" });
}
