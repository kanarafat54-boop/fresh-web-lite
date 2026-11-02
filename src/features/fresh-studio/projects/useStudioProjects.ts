import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { StudioProject } from "../shared/types.ts";
import { createStudioProjectService, type StudioBackend, type StudioProjectService } from "./projectService.ts";
import { createDeviceBackend } from "./deviceBackend.ts";

export type StorageSource = "account" | "device";

export type StudioProjectsState = {
  service: StudioProjectService | null;
  projects: StudioProject[];
  loading: boolean;
  /** Where projects are stored. "device" means they exist only in this browser. */
  source: StorageSource;
  /** Why account storage was not used, when source is "device". */
  fallbackReason: string | null;
  error: string | null;
  reload: () => Promise<void>;
  /** Replace one project in local state after a successful write. */
  applyUpdate: (project: StudioProject) => void;
  remove: (id: string) => void;
};

function browserStore() {
  return {
    getItem: (key: string) => { try { return window.localStorage.getItem(key); } catch { return null; } },
    setItem: (key: string, value: string) => { window.localStorage.setItem(key, value); },
  };
}

async function chooseBackend(): Promise<{ backend: StudioBackend; source: StorageSource; reason: string | null }> {
  const device = () => createDeviceBackend(browserStore());
  try {
    const [{ supabase }, { createSupabaseBackend, getSignedInUserId }] = await Promise.all([
      import("../../../lib/supabase"),
      import("./supabaseBackend.ts"),
    ]);
    const userId = await getSignedInUserId(supabase);
    if (!userId) return { backend: device(), source: "device", reason: "Sign in to keep projects in your account." };
    const backend = createSupabaseBackend(supabase, userId);
    await backend.listProjects(); // probe: surfaces missing tables / permission errors before the UI relies on it
    return { backend, source: "account", reason: null };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Account storage is unavailable.";
    return { backend: device(), source: "device", reason: `Using this device only. ${detail}` };
  }
}

export function useStudioProjects(): StudioProjectsState {
  const [service, setService] = useState<StudioProjectService | null>(null);
  const [projects, setProjects] = useState<StudioProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<StorageSource>("device");
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const serviceRef = useRef<StudioProjectService | null>(null);

  const load = useCallback(async (svc: StudioProjectService) => {
    try {
      setProjects(await svc.list());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load projects.");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const chosen = await chooseBackend();
      if (cancelled) return;
      const svc = createStudioProjectService(chosen.backend);
      serviceRef.current = svc;
      setService(svc);
      setSource(chosen.source);
      setFallbackReason(chosen.reason);
      await load(svc);
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [load]);

  const reload = useCallback(async () => {
    if (serviceRef.current) await load(serviceRef.current);
  }, [load]);

  const applyUpdate = useCallback((project: StudioProject) => {
    setProjects((current) => {
      const exists = current.some((p) => p.id === project.id);
      const next = exists ? current.map((p) => (p.id === project.id ? project : p)) : [project, ...current];
      return next.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    });
  }, []);

  const remove = useCallback((id: string) => setProjects((current) => current.filter((p) => p.id !== id)), []);

  return useMemo(
    () => ({ service, projects, loading, source, fallbackReason, error, reload, applyUpdate, remove }),
    [service, projects, loading, source, fallbackReason, error, reload, applyUpdate, remove],
  );
}
