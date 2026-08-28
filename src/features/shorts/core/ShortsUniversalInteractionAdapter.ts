import type {
  FreshInteractionAttachment,
  FreshInteractionCommand,
  FreshInteractionRemovableType,
  FreshInteractionResult,
} from "../../../core/interactions/FreshInteractionService";
import { createInteractionExecutor } from "../../../core/interactions/FreshInteractionService";
import { createSupabaseInteractionPersistence } from "../../../core/interactions/FreshInteractionPersistence";
import type {
  UniversalInteractionCapability,
  UniversalReactionKind,
} from "../../../core/interactions/FreshReactionModel";

/**
 * Canonical adapter for Shorts shared interactions.
 * Shorts keeps its media/feed domain logic, while shared interaction writes
 * converge on the Universal Interaction Service and Supabase persistence.
 */
export function createShortsInteractionTarget(
  shortId: string,
  capabilities: readonly UniversalInteractionCapability[] = [
    "react", "comment", "reply", "save", "share", "repost", "quote",
    "remix", "duet", "collaborate", "follow",
  ],
) {
  return { id: shortId, type: "short" as const, capabilities };
}

const execute = createInteractionExecutor(createSupabaseInteractionPersistence());

type ShortsInteractionType =
  | "react" | "comment" | "reply" | "save" | "share" | "repost"
  | "quote" | "remix" | "duet" | "collaborate" | "follow";

export async function interactWithShort(
  actorId: string,
  shortId: string,
  type: ShortsInteractionType,
  options: {
    reaction?: UniversalReactionKind;
    body?: string;
    attachments?: readonly FreshInteractionAttachment[];
    replyToId?: string;
    payload?: Record<string, unknown>;
  } = {},
): Promise<FreshInteractionResult> {
  const target = createShortsInteractionTarget(shortId);
  const command = type === "react"
    ? { type, actorId, target, reaction: options.reaction ?? "like", payload: options.payload }
    : { type, actorId, target, body: options.body, attachments: options.attachments, replyToId: options.replyToId, payload: options.payload };
  return execute.execute(command as FreshInteractionCommand);
}

/**
 * Undoes a previously-recorded toggleable interaction (react, save, repost,
 * follow, vote). A DB trigger mirrors this back into the legacy Shorts
 * tables (short_likes/short_reposts/saved_shorts) so existing counters and
 * views keep working without changes.
 */
export async function removeShortInteraction(
  actorId: string,
  shortId: string,
  removeType: FreshInteractionRemovableType,
): Promise<FreshInteractionResult> {
  const target = createShortsInteractionTarget(shortId);
  const command: FreshInteractionCommand = { type: "remove", actorId, target, removeType };
  return execute.execute(command);
}
