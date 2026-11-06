/**
 * Browser ports for export: the same-origin authenticated proxy to the render worker, and a private
 * Supabase Storage bucket for source files (signed, short-lived URLs). Secrets stay server-side.
 */
import { parseCapabilities, type ExportPorts, type RenderRequestBody, type WorkerCapabilities, type WorkerStatus } from "./exportJob.ts";

export const SOURCE_BUCKET = "studio-media";
const SIGNED_URL_SECONDS = 60 * 60;

async function session() {
  const { supabase } = await import("../../../lib/supabase");
  const { data, error } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const userId = data.session?.user.id;
  if (error || !token || !userId) throw new Error("Sign in to export. Your edit stays on this device until you do.");
  return { supabase, token, userId };
}

async function worker(path: string, init: RequestInit = {}): Promise<Response> {
  const { token } = await session();
  const res = await fetch(`/api/media-worker${path}`, { ...init, cache: "no-store", headers: { authorization: `Bearer ${token}`, ...(init.body ? { "content-type": "application/json" } : {}) } });
  if (!res.ok) {
    const detail = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(detail.error ?? `The render service answered ${res.status}.`);
  }
  return res;
}

export function createBrowserExportPorts(projectId: string): ExportPorts {
  return {
    async getCapabilities(): Promise<WorkerCapabilities> { return parseCapabilities(await (await worker("/capabilities")).json()); },
    async uploadSource(assetId, blob) {
      const { supabase, userId } = await session();
      const path = `${userId}/${projectId}/${assetId}`;
      const up = await supabase.storage.from(SOURCE_BUCKET).upload(path, blob, { upsert: true, contentType: blob.type || "application/octet-stream" });
      if (up.error) throw new Error(`Could not upload a source file: ${up.error.message}`);
      const signed = await supabase.storage.from(SOURCE_BUCKET).createSignedUrl(path, SIGNED_URL_SECONDS);
      if (signed.error || !signed.data?.signedUrl) throw new Error("Could not prepare the uploaded file for rendering.");
      return signed.data.signedUrl;
    },
    async submit(body: RenderRequestBody) {
      const data = (await (await worker("/renders", { method: "POST", body: JSON.stringify(body) })).json()) as { jobId?: string };
      if (!data.jobId) throw new Error("The render service did not return a job.");
      return { jobId: data.jobId };
    },
    async status(jobId) { return (await (await worker(`/jobs/${encodeURIComponent(jobId)}`)).json()) as WorkerStatus; },
    async cancel(jobId) { await worker(`/jobs/${encodeURIComponent(jobId)}`, { method: "DELETE" }); },
    async download(jobId) { return await (await worker(`/jobs/${encodeURIComponent(jobId)}/output`)).blob(); },
    sleep: (ms) => new Promise((r) => window.setTimeout(r, ms)),
  };
}
