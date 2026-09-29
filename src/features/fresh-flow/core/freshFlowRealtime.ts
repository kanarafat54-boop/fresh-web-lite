import { supabase } from "../../../lib/supabase";

export type FreshFlowRealtimeEvent =
  | { type: "media.updated"; mediaId: string }
  | { type: "interaction.created"; targetId: string; interactionType: string }
  | { type: "notification.created"; notificationId: string };

export function freshFlowChannel(userId: string | null) {
  const topic = userId ? `fresh-flow:user:${userId}` : "fresh-flow:public";
  return supabase.channel(topic);
}

export async function subscribeFreshFlow(
  userId: string | null,
  onEvent: (event: FreshFlowRealtimeEvent) => void,
) {
  const channel = freshFlowChannel(userId);
  channel.on("broadcast", { event: "fresh-flow" }, ({ payload }) => {
    if (payload && typeof payload === "object" && "type" in payload) {
      onEvent(payload as FreshFlowRealtimeEvent);
    }
  });
  await channel.subscribe();
  return () => { void supabase.removeChannel(channel); };
}
