import { Pool } from 'pg';

const connectionString = process.env.VECTOR_DB_URL || '';

export class VectorClient {
  pool: Pool | null = null;
  constructor() {
    if (!connectionString) return;
    this.pool = new Pool({ connectionString });
  }

  async upsertEmbedding(id: string, embedding: number[], metadata: any) {
    if (!this.pool) throw new Error('VECTOR_DB_URL not configured');
    await this.pool.query(
      'INSERT INTO embeddings(id, vector, metadata) VALUES($1, $2, $3) ON CONFLICT (id) DO UPDATE SET vector = EXCLUDED.vector, metadata = EXCLUDED.metadata',
      [id, embedding, metadata]
    );
  }

  async querySimilar(embedding: number[], limit = 10) {
    if (!this.pool) throw new Error('VECTOR_DB_URL not configured');
    const res = await this.pool.query('SELECT id, metadata FROM embeddings ORDER BY vector <-> $1 LIMIT $2', [embedding, limit]);
    return res.rows;
  }
}
