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

async function removeUniversalInteraction(
  command: Extract<FreshInteractionCommand, { type: 'remove' }>,
): Promise<void> {
  const { error } = await supabase
    .from('universal_interactions')
    .delete()
    .eq('actor_id', command.actorId)
    .eq('target_type', command.target.type)
    .eq('target_id', command.target.id)
    .eq('interaction_type', command.removeType)

  if (error) throw new Error(`Failed to remove interaction: ${error.message}`)
}

export async function persistUniversalInteraction(
  command: FreshInteractionCommand,
): Promise<void> {
  if (command.type === 'remove') {
    await removeUniversalInteraction(command)
    return
  }

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
    parent_id: 'replyToId' in command ? command.replyToId ?? null : null,
    payload: {
      ...('body' in command && command.body ? { body: command.body } : {}),
      ...('attachments' in command && command.attachments?.length ? { attachments: command.attachments } : {}),
      ...('payload' in command && command.payload ? command.payload : {}),
    },
  }

  const query = STATEFUL_INTERACTIONS.has(command.type)
    ? supabase
        .from('universal_interactions')
        .upsert(row, {
          onConflict: 'actor_id,target_type,target_id,state_key',
          ignoreDuplicates: false,
        })
    : supabase.from('universal_interactions').insert(row)

  const { error } = await query
  if (error) throw new Error(`Failed to persist interaction: ${error.message}`)
}

export function createSupabaseInteractionPersistence() {
  return persistUniversalInteraction
}
