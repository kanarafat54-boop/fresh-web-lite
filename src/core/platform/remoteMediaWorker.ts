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

// Keep the worker URL and API token server-side. The browser talks only to the
// same-origin authenticated Vercel proxy.
function baseUrl(): string {
  return "/api/media-worker";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const { supabase } = await import("../../lib/supabase");
  const { data, error } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (error || !token) throw new Error("Sign in to use Fresh media processing.");

  const response = await fetch(baseUrl() + path, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as { error?: string } & T;
  if (!response.ok) throw new Error(payload.error ?? "Fresh media worker request failed.");
  return payload;
}

export function isRemoteMediaWorkerConfigured(): boolean {
  // Server configuration is checked by the proxy so no secret is exposed here.
  return true;
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
