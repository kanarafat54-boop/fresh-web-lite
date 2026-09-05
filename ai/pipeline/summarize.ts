import { chat } from '../clients/llmClient';
import type { SourceDoc } from '../ingest/fetchSources';

export function chunk(text: string, size = 4000, overlap = 200): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < text.length) {
    out.push(text.slice(i, i + size));
    i += size - overlap;
  }
  return out;
}

export async function summarizeDoc(doc: SourceDoc): Promise<string> {
  const parts = chunk(doc.text);
  const partial: string[] = [];

  for (const part of parts.slice(0, 8)) {
    const s = await chat([
      { role: 'system', content: 'Summarize the text into concise factual bullet points.' },
      { role: 'user', content: part },
    ]);
    partial.push(s);
  }

  if (partial.length === 1) return partial[0];

  return chat([
    { role: 'system', content: 'Merge these partial summaries into one clean, non-redundant summary.' },
    { role: 'user', content: partial.join('\n\n---\n\n') },
  ]);
}
