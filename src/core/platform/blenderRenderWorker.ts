import { supabase } from "../../lib/supabase";

export type BlenderSceneObject = {
  name?: string;
  type: "cube" | "sphere" | "cone" | "torus" | "plane";
  position?: { x?: number; y?: number; z?: number };
  scale?: { x?: number; y?: number; z?: number };
  rotation?: { x?: number; y?: number; z?: number };
  color?: string;
};
export type BlenderSceneSpec = {
  title?: string;
  width?: number;
  height?: number;
  objects: BlenderSceneObject[];
};
export type BlenderRenderJob = {
  jobId: string;
  status: "queued" | "running" | "succeeded" | "failed";
  outputUrl?: string | null;
  outputBytes?: number;
  error?: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const { data, error } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (error || !token) throw new Error("Sign in to use Fresh 3D rendering.");
  const response = await fetch("/api/blender-worker" + path, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      ...(init?.body ? { "content-type": "application/json" } : {}),
      authorization: "Bearer " + token,
    },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({})) as { error?: string } & T;
  if (!response.ok) throw new Error(payload.error || "Fresh 3D render request failed.");
  return payload;
}

export async function submitBlenderRenderJob(scene: BlenderSceneSpec): Promise<{ jobId: string; status: "queued" }> {
  return request("/jobs", { method: "POST", body: JSON.stringify({ scene }) });
}
export async function getBlenderRenderJob(jobId: string): Promise<BlenderRenderJob> {
  return request("/jobs/" + encodeURIComponent(jobId), { method: "GET" });
}
export async function fetchBlenderRenderOutput(jobId: string): Promise<Blob> {
  const { data, error } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (error || !token) throw new Error("Sign in to retrieve the Fresh 3D render.");
  const response = await fetch("/api/blender-worker/jobs/" + encodeURIComponent(jobId) + "/output", {
    headers: { authorization: "Bearer " + token },
    cache: "no-store",
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(payload.error || "Fresh 3D render output is not available.");
  }
  return response.blob();
}
