import { supabase } from '../../lib/supabase'
import type { FreshInteractionCommand } from './FreshInteractionService'

const STATEFUL_INTERACTIONS = new Set([
  'react',
  'vote',
  'save',
  'follow',
  'repost',
  'quote',
])

/**
 * Persists an accepted universal interaction without creating a second
 * ecosystem-specific storage path.
 *
 * Stateful interactions are upserted so a user's current reaction/vote/save
 * state can be changed. Event interactions are inserted so comments, shares,
 * remixes, duets, etc. can occur repeatedly.
 */
export async function persistUniversalInteraction(
  command: FreshInteractionCommand,
): Promise<void> {
  const row = {
    actor_id: command.actorId,
    target_type: command.target.type,
    target_id: command.target.id,
    interaction_type: command.type,
    interaction_value:
      command.type === 'react'
        ? command.reaction
        : command.type === 'vote'
          ? command.optionId
          : null,
    parent_id: null,
    payload: {},
  }

  const query = STATEFUL_INTERACTIONS.has(command.type)
    ? supabase
        .from('universal_interactions')
        .upsert(row, {
          onConflict: 'actor_id,target_type,target_id',
          ignoreDuplicates: false,
        })
    : supabase.from('universal_interactions').insert(row)

  const { error } = await query
  if (error) throw new Error(`Failed to persist interaction: ${error.message}`)
}

export function createSupabaseInteractionPersistence() {
  return persistUniversalInteraction
}
