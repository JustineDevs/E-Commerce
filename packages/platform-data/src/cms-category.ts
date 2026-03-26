import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingTableOrSchemaError } from "./supabase-errors";
import type { CmsBlock } from "./cms-types";

export type CmsCategoryContentRow = {
  id: string;
  collection_handle: string;
  locale: string;
  intro_html: string;
  banner_url: string | null;
  blocks: CmsBlock[];
  updated_at: string;
};

function parseBlocks(v: unknown): CmsBlock[] {
  if (!Array.isArray(v)) return [];
  const out: CmsBlock[] = [];
  for (const item of v) {
    if (item && typeof item === "object" && "type" in item) {
      const r = item as Record<string, unknown>;
      out.push({
        id: typeof r.id === "string" ? r.id : `blk_${Math.random().toString(36).slice(2, 11)}`,
        type: String(r.type ?? "unknown"),
        props: r.props && typeof r.props === "object" ? (r.props as Record<string, unknown>) : {},
      });
    }
  }
  return out;
}

export async function listCmsCategoryContent(supabase: SupabaseClient): Promise<CmsCategoryContentRow[]> {
  const { data, error } = await supabase
    .from("cms_category_content")
    .select("*")
    .order("collection_handle");
  if (error) {
    if (isMissingTableOrSchemaError(error)) return [];
    console.error("[cms-category] list", error.message);
    return [];
  }
  return (data ?? []).map((r) => ({
    id: String((r as Record<string, unknown>).id),
    collection_handle: String((r as Record<string, unknown>).collection_handle ?? ""),
    locale: String((r as Record<string, unknown>).locale ?? "en"),
    intro_html: String((r as Record<string, unknown>).intro_html ?? ""),
    banner_url:
      (r as Record<string, unknown>).banner_url != null
        ? String((r as Record<string, unknown>).banner_url)
        : null,
    blocks: parseBlocks((r as Record<string, unknown>).blocks),
    updated_at: String((r as Record<string, unknown>).updated_at ?? ""),
  }));
}

export async function upsertCmsCategoryContent(
  supabase: SupabaseClient,
  input: {
    id?: string;
    collection_handle: string;
    locale?: string;
    intro_html?: string;
    banner_url?: string | null;
    blocks?: CmsBlock[];
  },
): Promise<CmsCategoryContentRow | null> {
  const locale = input.locale ?? "en";
  const row = {
    collection_handle: input.collection_handle,
    locale,
    intro_html: input.intro_html ?? "",
    banner_url: input.banner_url ?? null,
    blocks: (input.blocks ?? []) as unknown as Record<string, unknown>[],
    updated_at: new Date().toISOString(),
  };
  if (input.id) {
    const { data, error } = await supabase
      .from("cms_category_content")
      .update(row)
      .eq("id", input.id)
      .select("*")
      .single();
    if (error) {
      console.error("[cms-category] update", error.message);
      return null;
    }
    const r = data as Record<string, unknown>;
    return {
      id: String(r.id),
      collection_handle: String(r.collection_handle ?? ""),
      locale: String(r.locale ?? "en"),
      intro_html: String(r.intro_html ?? ""),
      banner_url: r.banner_url != null ? String(r.banner_url) : null,
      blocks: parseBlocks(r.blocks),
      updated_at: String(r.updated_at ?? ""),
    };
  }
  const { data, error } = await supabase
    .from("cms_category_content")
    .upsert(row, { onConflict: "collection_handle,locale" })
    .select("*")
    .single();
  if (error) {
    console.error("[cms-category] upsert", error.message);
    return null;
  }
  const r = data as Record<string, unknown>;
  return {
    id: String(r.id),
    collection_handle: String(r.collection_handle ?? ""),
    locale: String(r.locale ?? "en"),
    intro_html: String(r.intro_html ?? ""),
    banner_url: r.banner_url != null ? String(r.banner_url) : null,
    blocks: parseBlocks(r.blocks),
    updated_at: String(r.updated_at ?? ""),
  };
}

export async function getCmsCategoryContentPublic(
  supabase: SupabaseClient,
  collectionHandle: string,
  locale: string,
): Promise<CmsCategoryContentRow | null> {
  const { data, error } = await supabase
    .from("cms_category_content")
    .select("*")
    .eq("collection_handle", collectionHandle)
    .eq("locale", locale)
    .maybeSingle();
  if (error) {
    if (isMissingTableOrSchemaError(error)) return null;
    console.error("[cms-category] get public", error.message);
    return null;
  }
  if (!data) return null;
  const r = data as Record<string, unknown>;
  return {
    id: String(r.id),
    collection_handle: String(r.collection_handle ?? ""),
    locale: String(r.locale ?? "en"),
    intro_html: String(r.intro_html ?? ""),
    banner_url: r.banner_url != null ? String(r.banner_url) : null,
    blocks: parseBlocks(r.blocks),
    updated_at: String(r.updated_at ?? ""),
  };
}
