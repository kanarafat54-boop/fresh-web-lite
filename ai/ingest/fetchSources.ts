export type SourceDoc = {
  id: string;
  url: string;
  title?: string;
  text: string;
  fetchedAt: string;
};

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function fetchSource(url: string): Promise<SourceDoc> {
  const res = await fetch(url, { headers: { 'User-Agent': 'fresh-web-lite/1.0' } });
  if (!res.ok) throw new Error(`Fetch failed for ${url}: ${res.status}`);
  const html = await res.text();
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);

  return {
    id: Buffer.from(url).toString('base64url').slice(0, 24),
    url,
    title: titleMatch ? titleMatch[1].trim() : undefined,
    text: stripHtml(html),
    fetchedAt: new Date().toISOString(),
  };
}

export async function fetchAll(urls: string[]): Promise<SourceDoc[]> {
  const results = await Promise.allSettled(urls.map(fetchSource));
  return results
    .filter((r): r is PromiseFulfilledResult<SourceDoc> => r.status === 'fulfilled')
    .map((r) => r.value);
}
