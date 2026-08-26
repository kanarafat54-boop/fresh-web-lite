import {
  canInteractWithTarget,
  canReactToTarget,
  canVoteOnTarget,
  type UniversalInteractionCapability,
  type UniversalInteractionTarget,
  type UniversalReactionKind,
} from './FreshReactionModel'

export type FreshInteractionCommand =
  | {
      type: 'react'
      actorId: string
      target: UniversalInteractionTarget
      reaction: UniversalReactionKind
    }
  | {
      type: 'vote'
      actorId: string
      target: UniversalInteractionTarget
      optionId: string
    }
  | {
      type: 'comment' | 'reply' | 'save' | 'share' | 'repost' | 'quote' | 'remix' | 'duet' | 'collaborate'
      actorId: string
      target: UniversalInteractionTarget
    }

export type FreshInteractionResult =
  | { accepted: true; command: FreshInteractionCommand }
  | { accepted: false; reason: string }

const commandCapability: Record<Exclude<FreshInteractionCommand['type'], 'react' | 'vote'>, UniversalInteractionCapability> = {
  comment: 'comment',
  reply: 'reply',
  save: 'save',
  share: 'share',
  repost: 'repost',
  quote: 'quote',
  remix: 'remix',
  duet: 'duet',
  collaborate: 'collaborate',
}

/**
 * Validates interaction intent before a feature adapter or persistence layer executes it.
 * This is deliberately persistence-agnostic: adapters decide how an accepted command is stored.
 */
export function validateInteractionCommand(command: FreshInteractionCommand): FreshInteractionResult {
  if (!command.actorId.trim() || !command.target.id.trim()) {
    return { accepted: false, reason: 'actorId and target.id are required' }
  }

  if (command.type === 'react') {
    return canReactToTarget(command.target)
      ? { accepted: true, command }
      : { accepted: false, reason: 'Target does not support reactions' }
  }

  if (command.type === 'vote') {
    return canVoteOnTarget(command.target) && command.optionId.trim().length > 0
      ? { accepted: true, command }
      : { accepted: false, reason: 'Target is not a votable poll or optionId is missing' }
  }

  const capability = commandCapability[command.type]
  return canInteractWithTarget(command.target, capability)
    ? { accepted: true, command }
    : { accepted: false, reason: `Target does not support ${capability}` }
}

export type FreshInteractionExecutor = {
  execute(command: FreshInteractionCommand): Promise<FreshInteractionResult>
}

/**
 * Small execution boundary for ecosystem adapters. It prevents UI code from
 * bypassing capability checks and makes Shorts/Flow share the same command path.
 */
export function createInteractionExecutor(
  persist: (command: FreshInteractionCommand) => Promise<void>,
): FreshInteractionExecutor {
  return {
    async execute(command) {
      const validation = validateInteractionCommand(command)
      if (!validation.accepted) return validation

      await persist(command)
      return validation
    },
  }
}
