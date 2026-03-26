import { tryCreateSupabaseClient } from "@apparel-commerce/database";

export type ChannelEventRow = {
  id: string;
  channel: string;
  event_type: string;
  received_at: string;
};

export async function fetchRecentChannelEvents(
  limit = 50,
): Promise<ChannelEventRow[]> {
  const supabase = tryCreateSupabaseClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("channel_sync_events")
    .select("id, channel, event_type, received_at")
    .order("received_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[channel-events-bridge]", error.message);
    return [];
  }

  return (data ?? []).map((r) => ({
    id: String((r as { id: string }).id),
    channel: String((r as { channel: string }).channel),
    event_type: String((r as { event_type: string }).event_type),
    received_at: String((r as { received_at: string }).received_at),
  }));
}
