import { fetchAll } from '../ingest/fetchSources';
import { summarizeDoc } from '../pipeline/summarize';

export type RunResult = {
  startedAt: string;
  finishedAt: string;
  docs: number;
  summaries: { url: string; title?: string; summary: string }[];
  errors: string[];
};

export async function runGraph(urls: string[]): Promise<RunResult> {
  const startedAt = new Date().toISOString();
  const errors: string[] = [];
  const docs = await fetchAll(urls);
  const summaries: RunResult['summaries'] = [];

  for (const d of docs) {
    try {
      summaries.push({ url: d.url, title: d.title, summary: await summarizeDoc(d) });
    } catch (e: any) {
      errors.push(`${d.url}: ${e?.message ?? String(e)}`);
    }
  }

  return {
    startedAt,
    finishedAt: new Date().toISOString(),
    docs: docs.length,
    summaries,
    errors,
  };
}
