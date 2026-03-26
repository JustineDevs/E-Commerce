import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingTableOrSchemaError } from "./supabase-errors";

export type CmsMediaRow = {
  id: string;
  storage_path: string;
  public_url: string;
  alt_text: string | null;
  mime_type: string | null;
  width: number | null;
  height: number | null;
  created_at: string;
};

export async function listCmsMedia(supabase: SupabaseClient, limit = 100): Promise<CmsMediaRow[]> {
  const { data, error } = await supabase
    .from("cms_media")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    if (isMissingTableOrSchemaError(error)) return [];
    console.error("[cms-media] list", error.message);
    return [];
  }
  return (data ?? []).map((r) => {
    const x = r as Record<string, unknown>;
    return {
      id: String(x.id),
      storage_path: String(x.storage_path ?? ""),
      public_url: String(x.public_url ?? ""),
      alt_text: x.alt_text != null ? String(x.alt_text) : null,
      mime_type: x.mime_type != null ? String(x.mime_type) : null,
      width: typeof x.width === "number" ? x.width : null,
      height: typeof x.height === "number" ? x.height : null,
      created_at: String(x.created_at ?? ""),
    };
  });
}

export async function insertCmsMedia(
  supabase: SupabaseClient,
  row: Omit<CmsMediaRow, "id" | "created_at">,
): Promise<CmsMediaRow | null> {
  const { data, error } = await supabase
    .from("cms_media")
    .insert({
      storage_path: row.storage_path,
      public_url: row.public_url,
      alt_text: row.alt_text,
      mime_type: row.mime_type,
      width: row.width,
      height: row.height,
      created_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error) {
    console.error("[cms-media] insert", error.message);
    return null;
  }
  const x = data as Record<string, unknown>;
  return {
    id: String(x.id),
    storage_path: String(x.storage_path ?? ""),
    public_url: String(x.public_url ?? ""),
    alt_text: x.alt_text != null ? String(x.alt_text) : null,
    mime_type: x.mime_type != null ? String(x.mime_type) : null,
    width: typeof x.width === "number" ? x.width : null,
    height: typeof x.height === "number" ? x.height : null,
    created_at: String(x.created_at ?? ""),
  };
}
