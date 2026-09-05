import { fetchRssFeed } from '../ingest/connectorExample';
import { TextGenClient } from '../clients/textGenClient';
import { VectorClient } from '../clients/vectorClient';

export async function runIngestSample() {
  const t = new TextGenClient();
  const v = new VectorClient();

  const feed = await fetchRssFeed('https://example.com/feed.xml');
  const summary = await t.generate(\`Summarize: \${feed.raw}\`);
  const embedding = Array(1536).fill(0).map(() => Math.random());
  await v.upsertEmbedding('sample-1', embedding, { source: 'example' });
  console.log('Ingested sample:', summary);
}
