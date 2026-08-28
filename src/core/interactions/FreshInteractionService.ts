import {
  canInteractWithTarget,
  canReactToTarget,
  canVoteOnTarget,
  type UniversalInteractionCapability,
  type UniversalInteractionTarget,
  type UniversalReactionKind,
  type InteractionMediaKind,
} from './FreshReactionModel'

export type FreshInteractionAttachment = {
  kind: InteractionMediaKind
  url: string
  mimeType?: string
  durationMs?: number
  thumbnailUrl?: string
  altText?: string
  metadata?: Record<string, unknown>
}

export type FreshInteractionPayload = Record<string, unknown>

/** Interaction types that represent a toggleable state and can be undone. */
export type FreshInteractionRemovableType = 'react' | 'vote' | 'save' | 'repost' | 'follow'

export type FreshInteractionCommand =
  | {
      type: 'react'
      actorId: string
      target: UniversalInteractionTarget
      reaction: UniversalReactionKind
      payload?: FreshInteractionPayload
    }
  | {
      type: 'vote'
      actorId: string
      target: UniversalInteractionTarget
      optionId: string
      payload?: FreshInteractionPayload
    }
  | {
      type: 'remove'
      actorId: string
      target: UniversalInteractionTarget
      removeType: FreshInteractionRemovableType
      payload?: FreshInteractionPayload
    }
  | {
      type: 'comment' | 'reply' | 'save' | 'share' | 'repost' | 'quote' | 'remix' | 'duet' | 'collaborate' | 'follow'
      actorId: string
      target: UniversalInteractionTarget
      body?: string
      attachments?: readonly FreshInteractionAttachment[]
      replyToId?: string
      payload?: FreshInteractionPayload
    }

export type FreshInteractionResult =
  | { accepted: true; command: FreshInteractionCommand }
  | { accepted: false; reason: string }

const commandCapability: Record<Exclude<FreshInteractionCommand['type'], 'react' | 'vote' | 'remove'>, UniversalInteractionCapability> = {
  comment: 'comment',
  reply: 'reply',
  save: 'save',
  share: 'share',
  repost: 'repost',
  quote: 'quote',
  remix: 'remix',
  duet: 'duet',
  collaborate: 'collaborate',
  follow: 'follow',
}

function validateAttachments(attachments: readonly FreshInteractionAttachment[] | undefined): string | null {
  if (!attachments) return null
  for (const attachment of attachments) {
    if (!attachment.url.trim()) return 'Attachment url is required'
    if (!attachment.kind) return 'Attachment kind is required'
  }
  return null
}

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

  if (command.type === 'remove') {
    if (command.removeType === 'react') {
      return canReactToTarget(command.target)
        ? { accepted: true, command }
        : { accepted: false, reason: 'Target does not support reactions' }
    }
    if (command.removeType === 'vote') {
      return canVoteOnTarget(command.target)
        ? { accepted: true, command }
        : { accepted: false, reason: 'Target is not a votable poll' }
    }
    const removeCapability = command.removeType as UniversalInteractionCapability
    return canInteractWithTarget(command.target, removeCapability)
      ? { accepted: true, command }
      : { accepted: false, reason: `Target does not support ${removeCapability}` }
  }

  const attachmentError = validateAttachments(command.attachments)
  if (attachmentError) return { accepted: false, reason: attachmentError }

  if (command.type === 'reply' && !command.replyToId?.trim()) {
    return { accepted: false, reason: 'replyToId is required for replies' }
  }

  if ((command.type === 'comment' || command.type === 'reply') && !command.body?.trim() && !command.attachments?.length) {
    return { accepted: false, reason: 'Comment or reply requires body or attachment' }
  }

  const capability = commandCapability[command.type]
  return canInteractWithTarget(command.target, capability)
    ? { accepted: true, command }
    : { accepted: false, reason: `Target does not support ${capability}` }
}

export type FreshInteractionExecutor = {
  execute(command: FreshInteractionCommand): Promise<FreshInteractionResult>
}

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
