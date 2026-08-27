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

function getStateKey(command: FreshInteractionCommand): string | null {
  if (command.type === 'react') return `reaction:${command.reaction}`
  if (command.type === 'vote') return `vote:${command.optionId}`
  if (STATEFUL_INTERACTIONS.has(command.type)) return command.type
  return null
}

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
    state_key: getStateKey(command),
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
          onConflict: 'actor_id,target_type,target_id,interaction_type',
          ignoreDuplicates: false,
        })
    : supabase.from('universal_interactions').insert(row)

  const { error } = await query
  if (error) throw new Error(`Failed to persist interaction: ${error.message}`)
}

export function createSupabaseInteractionPersistence() {
  return persistUniversalInteraction
}
