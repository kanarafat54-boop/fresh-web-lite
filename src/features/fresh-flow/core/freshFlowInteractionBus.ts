import { supabase } from "../../../lib/supabase";

export type FreshFlowInteractionInput = {
  actorId: string;
  targetType: string;
  targetId: string;
  interactionType: string;
  interactionValue?: string | null;
  parentId?: string | null;
  payload?: Record<string, unknown>;
};

export async function persistFreshFlowInteraction(input: FreshFlowInteractionInput) {
  const { error } = await supabase.from("universal_interactions").upsert({
    actor_id: input.actorId,
    target_type: input.targetType,
    target_id: input.targetId,
    interaction_type: input.interactionType,
    interaction_value: input.interactionValue ?? null,
    parent_id: input.parentId ?? null,
    payload: input.payload ?? {},
  }, { onConflict: "actor_id,target_type,target_id,interaction_type" });

  if (error) throw new Error(`Fresh Flow interaction failed: ${error.message}`);
}

export async function broadcastFreshFlowEvent(
  userId: string | null,
  event: Record<string, unknown>,
) {
  const topic = userId ? `fresh-flow:user:${userId}` : "fresh-flow:media";
  const channel = supabase.channel(topic);
  try {
    await channel.send({ type: "broadcast", event: "fresh-flow", payload: event });
  } finally {
    await supabase.removeChannel(channel);
  }
}
