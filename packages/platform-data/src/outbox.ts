import type { SupabaseClient } from "@supabase/supabase-js";

export type OutboxEvent = {
  id?: string;
  aggregate_type: string;
  aggregate_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  created_at?: string;
  processed_at?: string | null;
  retry_count?: number;
};

export async function enqueueOutboxEvent(
  supabase: SupabaseClient,
  event: Omit<OutboxEvent, "id" | "created_at" | "processed_at" | "retry_count">,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("outbox_events")
    .insert({
      aggregate_type: event.aggregate_type,
      aggregate_id: event.aggregate_id,
      event_type: event.event_type,
      payload: event.payload,
      retry_count: 0,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[outbox] enqueue failed:", error.message);
    return null;
  }
  return data?.id ?? null;
}

export async function listPendingOutboxEvents(
  supabase: SupabaseClient,
  limit = 50,
): Promise<OutboxEvent[]> {
  const { data, error } = await supabase
    .from("outbox_events")
    .select("*")
    .is("processed_at", null)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("[outbox] list pending failed:", error.message);
    return [];
  }
  return (data ?? []) as OutboxEvent[];
}

export async function markOutboxEventProcessed(
  supabase: SupabaseClient,
  eventId: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("outbox_events")
    .update({ processed_at: new Date().toISOString() })
    .eq("id", eventId);

  if (error) {
    console.error("[outbox] mark processed failed:", error.message);
    return false;
  }
  return true;
}

export async function incrementOutboxRetry(
  supabase: SupabaseClient,
  eventId: string,
): Promise<void> {
  await supabase.rpc("increment_outbox_retry", { event_id: eventId });
}

export type OutboxHandler = (event: OutboxEvent) => Promise<void>;

const handlers = new Map<string, OutboxHandler[]>();

export function registerOutboxHandler(eventType: string, handler: OutboxHandler): void {
  const existing = handlers.get(eventType) ?? [];
  existing.push(handler);
  handlers.set(eventType, existing);
}

export async function processOutboxBatch(
  supabase: SupabaseClient,
  limit = 50,
): Promise<{ processed: number; failed: number }> {
  const events = await listPendingOutboxEvents(supabase, limit);
  let processed = 0;
  let failed = 0;

  for (const event of events) {
    const eventHandlers = handlers.get(event.event_type) ?? [];
    if (eventHandlers.length === 0) {
      await markOutboxEventProcessed(supabase, event.id!);
      processed++;
      continue;
    }

    try {
      for (const handler of eventHandlers) {
        await handler(event);
      }
      await markOutboxEventProcessed(supabase, event.id!);
      processed++;
    } catch (err) {
      console.error(`[outbox] handler failed for ${event.event_type}:`, err);
      await incrementOutboxRetry(supabase, event.id!);
      failed++;
    }
  }

  return { processed, failed };
}
