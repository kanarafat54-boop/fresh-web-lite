/**
 * Write one "state" interaction (react, vote, save, follow, repost, quote) for an actor and target.
 *
 * The database keeps one current row per actor, target and state through a PARTIAL unique index on the generated
 * `state_key` column. PostgREST's `upsert(..., { onConflict })` cannot target a partial index, so it fails with
 * "there is no unique or exclusion constraint matching the ON CONFLICT specification". This helper does the same job
 * with a read, then an update or an insert, and treats a lost race (unique violation) as an update.
 *
 * `state_key` is a generated column: it must never be written.
 */
export type InteractionRow = {
  actor_id: string
  target_type: string
  target_id: string
  interaction_type: string
  [column: string]: unknown
}

type WriteResult = { error: { code?: string; message: string } | null }

// A deliberately loose client type so tests can pass a small fake.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TableClient = { from(table: string): any }

const TABLE = 'universal_interactions'

export async function writeStatefulInteraction(client: TableClient, row: InteractionRow): Promise<WriteResult> {
  const { actor_id, target_type, target_id, interaction_type, state_key: _ignored, ...changes } = row
  void _ignored
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const match = (query: any) =>
    query.eq('actor_id', actor_id).eq('target_type', target_type).eq('target_id', target_id).eq('interaction_type', interaction_type)

  const existing = await match(client.from(TABLE).select('id')).limit(1).maybeSingle()
  if (existing.error) return { error: existing.error }
  if (existing.data) return await match(client.from(TABLE).update(changes))

  const inserted = await client.from(TABLE).insert({ actor_id, target_type, target_id, interaction_type, ...changes })
  if (inserted.error?.code === '23505') return await match(client.from(TABLE).update(changes))
  return inserted
}
