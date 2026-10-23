import { createVercelNodeHandler } from "../../src/server/vercelNodeAdapter.js";

export const config = { maxDuration: 20 };

type CommonsPage = {
  title?: string;
  imageinfo?: Array<{
    thumburl?: string;
    url?: string;
    descriptionurl?: string;
    extmetadata?: Record<string, { value?: string }>;
  }>;
};
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { "cache-control": "no-store" } });
const plain = (value?: string) => (value ?? "").replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#039;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim().slice(0, 500);

export async function GET(): Promise<Response> {
  return json({ error: "Method not allowed" }, 405, { Allow: "POST" });
}

export async function POST(req: Request): Promise<Response> {
  let body: { query?: unknown; limit?: unknown };
  try { body = await req.json() as typeof body; } catch { return json({ error: "Invalid JSON body" }, 400); }
  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (!query) return json({ error: "query is required" }, 400);
  if (query.length > 300) return json({ error: "query must be 300 characters or fewer" }, 400);
  const requested = typeof body.limit === "number" && Number.isFinite(body.limit) ? Math.trunc(body.limit) : 12;
  const limit = Math.min(Math.max(requested, 1), 20);
  const params = new URLSearchParams({
    action: "query", format: "json", generator: "search", gsrsearch: query, gsrnamespace: "6", gsrlimit: String(limit),
    prop: "imageinfo", iiprop: "url|extmetadata", iiurlwidth: "640",
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch("https://commons.wikimedia.org/w/api.php?" + params.toString(), {
      signal: controller.signal,
      headers: { accept: "application/json", "user-agent": "FreshWebLite/1.0 (https://fresh-web-lite.vercel.app; image search)" },
    });
    if (!response.ok) return json({ error: "Wikimedia Commons image search returned HTTP " + response.status, provider: "Wikimedia Commons" }, 502);
    const payload = await response.json() as { query?: { pages?: Record<string, CommonsPage> }; error?: { info?: string } };
    if (payload.error) return json({ error: payload.error.info || "Wikimedia Commons image search failed", provider: "Wikimedia Commons" }, 502);
    const images = Object.values(payload.query?.pages ?? []).flatMap((page) => {
      const info = page.imageinfo?.[0];
      if (!info?.thumburl || !info.descriptionurl) return [];
      try {
        const thumbnail = new URL(info.thumburl);
        const source = new URL(info.descriptionurl);
        if (thumbnail.protocol !== "https:" || thumbnail.hostname !== "upload.wikimedia.org" || source.protocol !== "https:" || source.hostname !== "commons.wikimedia.org") return [];
      } catch { return []; }
      const meta = info.extmetadata ?? {};
      return [{
        title: plain(page.title?.replace(/^File:/, "").replace(/_/g, " ")) || "Wikimedia Commons image",
        thumbnailUrl: info.thumburl,
        imageUrl: info.url ?? info.thumburl,
        sourceUrl: info.descriptionurl,
        description: plain(meta.ImageDescription?.value) || plain(page.title),
        author: plain(meta.Artist?.value) || "Author not listed",
        license: plain(meta.LicenseShortName?.value) || "License details on source page",
        provider: "Wikimedia Commons",
      }];
    });
    return json({ query, provider: "Wikimedia Commons", results: images, resultCount: images.length, searchedAt: new Date().toISOString() });
  } catch (error) {
    return json({ error: error instanceof Error && error.name === "AbortError" ? "Image search timed out. Please retry." : "Wikimedia Commons image search is temporarily unavailable.", provider: "Wikimedia Commons" }, 502);
  } finally { clearTimeout(timeout); }
}

export default createVercelNodeHandler({ GET, POST });
