import fetch from 'node-fetch';

export async function fetchRssFeed(url: string) {
  const res = await fetch(url, { headers: { 'User-Agent': 'fresh-ai-bot/1.0' } });
  const text = await res.text();
  return { raw: text };
}
