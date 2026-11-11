import { handleMachineRequest } from "./machineGateway.js";
import { createSupabaseDeps, readMachineEnv } from "./supabaseDeps.js";

/** Entry used by the dispatcher in api/ai/ask.ts. */
export async function handleMachineGateway(req: Request): Promise<Response> {
  const env = readMachineEnv();
  if (!env) return Response.json({ ok: false, error: { code: "unavailable", message: "Machine access is not configured." } }, { status: 503, headers: { "cache-control": "no-store" } });
  const path = new URL(req.url).searchParams.get("__fresh_machine") ?? "";
  return handleMachineRequest(req, path, createSupabaseDeps(env));
}
