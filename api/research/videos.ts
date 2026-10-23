import { createVercelNodeHandler } from "../../src/server/vercelNodeAdapter.js";

export const config = { maxDuration: 25 };

type ArchiveDoc = { identifier?: string; title?: string; description?: string; creator?: string | string[]; date?: string };
type ArchiveFile = { name?: string; format?: string; size?: string };
type ArchiveMetadata = { metadata?: { title?: string; description?: string; creator?: string | string[]; date?: string }; files?: ArchiveFile[] };
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { "cache-control": "no-store" } });
const text = (value?: string | string[]) => (Array.isArray(value) ? value.join(", ") : value ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 500);

export async function GET(): Promise<Response> {
  return json({ error: "Method not allowed" }, 405, { Allow: "POST" });
}

export async function POST(req: Request): Promise<Response> {
  let body: { query?: unknown; limit?: unknown };
  try { body = await req.json() as typeof body; } catch { return json({ error: "Invalid JSON body" }, 400); }
  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (!query) return json({ error: "query is required" }, 400);
  if (query.length > 300) return json({ error: "query must be 300 characters or fewer" }, 400);
  const requested = typeof body.limit === "number" && Number.isFinite(body.limit) ? Math.trunc(body.limit) : 8;
  const limit = Math.min(Math.max(requested, 1), 12);
  const params = new URLSearchParams({ q: query + " AND mediatype:movies", "fl[]": "identifier,title,description,creator,date", rows: String(limit), page: "1", output: "json" });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch("https://archive.org/advancedsearch.php?" + params.toString(), { signal: controller.signal, headers: { accept: "application/json" } });
    if (!response.ok) return json({ error: "Internet Archive video search returned HTTP " + response.status, provider: "Internet Archive" }, 502);
    const payload = await response.json() as { response?: { docs?: ArchiveDoc[] } };
    const docs = (payload.response?.docs ?? []).filter((doc) => typeof doc.identifier === "string" && /^[A-Za-z0-9._-]+$/.test(doc.identifier)).slice(0, limit);
    const results = await Promise.all(docs.map(async (doc) => {
      try {
        const metaController = new AbortController();
        const metaTimeout = setTimeout(() => metaController.abort(), 7000);
        try {
          const metaResponse = await fetch("https://archive.org/metadata/" + encodeURIComponent(doc.identifier as string), { signal: metaController.signal, headers: { accept: "application/json" } });
          if (!metaResponse.ok) return null;
          const metadata = await metaResponse.json() as ArchiveMetadata;
          const file = (metadata.files ?? []).find((item) => /\.mp4$/i.test(item.name ?? "") || /mpeg4|h\.264/i.test(item.format ?? ""));
          if (!file?.name) return null;
          const filename = file.name.split("/").map(encodeURIComponent).join("/");
          return {
            id: doc.identifier,
            title: text(metadata.metadata?.title ?? doc.title) || "Internet Archive video",
            description: text(metadata.metadata?.description ?? doc.description),
            creator: text(metadata.metadata?.creator ?? doc.creator) || "Creator not listed",
            date: metadata.metadata?.date ?? doc.date ?? null,
            thumbnailUrl: "https://archive.org/services/img/" + encodeURIComponent(doc.identifier as string),
            videoUrl: "https://archive.org/download/" + encodeURIComponent(doc.identifier as string) + "/" + filename,
            sourceUrl: "https://archive.org/details/" + encodeURIComponent(doc.identifier as string),
            provider: "Internet Archive",
          };
        } finally { clearTimeout(metaTimeout); }
      } catch { return null; }
    }));
    const videos = results.filter((item): item is NonNullable<typeof item> => item !== null);
    return json({ query, provider: "Internet Archive", results: videos, resultCount: videos.length, searchedAt: new Date().toISOString() });
  } catch (error) {
    return json({ error: error instanceof Error && error.name === "AbortError" ? "Video search timed out. Please retry." : "Internet Archive video search is temporarily unavailable.", provider: "Internet Archive" }, 502);
  } finally { clearTimeout(timeout); }
}

export default createVercelNodeHandler({ GET, POST });
