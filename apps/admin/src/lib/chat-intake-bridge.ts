import { tryCreateSupabaseClient } from "@apparel-commerce/database";

export type ChatIntakeRow = {
  id: string;
  source: string;
  status: string;
  phone: string | null;
  address: string | null;
  raw_text: string | null;
  medusa_draft_order_id: string | null;
  created_at: string;
};

export async function fetchRecentChatIntake(limit = 50): Promise<ChatIntakeRow[]> {
  const supabase = tryCreateSupabaseClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("chat_order_intake")
    .select(
      "id, source, status, phone, address, raw_text, medusa_draft_order_id, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[chat-intake-bridge]", error.message);
    return [];
  }

  return (data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    return {
      id: String(row.id ?? ""),
      source: String(row.source ?? ""),
      status: String(row.status ?? ""),
      phone: typeof row.phone === "string" ? row.phone : null,
      address: typeof row.address === "string" ? row.address : null,
      raw_text: typeof row.raw_text === "string" ? row.raw_text : null,
      medusa_draft_order_id:
        typeof row.medusa_draft_order_id === "string"
          ? row.medusa_draft_order_id
          : null,
      created_at: String(row.created_at ?? ""),
    };
  });
}
