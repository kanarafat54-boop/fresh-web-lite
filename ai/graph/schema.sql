CREATE TABLE IF NOT EXISTS kg_nodes (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kg_edges (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES kg_nodes(id),
  target_id TEXT NOT NULL REFERENCES kg_nodes(id),
  relation TEXT NOT NULL,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS embeddings (
  id TEXT PRIMARY KEY,
  vector FLOAT8[],
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
