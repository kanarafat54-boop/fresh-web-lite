export function getServerEnv(name: string): string | undefined {
  if (typeof globalThis === "undefined") return undefined;
  const runtime = (globalThis as Record<string, unknown>).process;
  if (!runtime || typeof runtime !== "object") return undefined;
  const env = (runtime as { env?: unknown }).env;
  if (!env || typeof env !== "object") return undefined;
  const value = (env as Record<string, unknown>)[name];
  return typeof value === "string" ? value : undefined;
}
