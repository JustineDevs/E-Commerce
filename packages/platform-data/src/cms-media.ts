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
  deleted_at: string | null;
  display_name: string | null;
  byte_size: number | null;
  tags: string[];
};

export type ListCmsMediaOptions = {
  limit?: number;
  search?: string;
  mimePrefix?: string;
  sort?: "created_desc" | "created_asc" | "name_asc" | "name_desc";
  includeDeleted?: boolean;
  tag?: string;
};

function mapRow(x: Record<string, unknown>): CmsMediaRow {
  const tags = x.tags;
  return {
    id: String(x.id),
    storage_path: String(x.storage_path ?? ""),
    public_url: String(x.public_url ?? ""),
    alt_text: x.alt_text != null ? String(x.alt_text) : null,
    mime_type: x.mime_type != null ? String(x.mime_type) : null,
    width: typeof x.width === "number" ? x.width : null,
    height: typeof x.height === "number" ? x.height : null,
    created_at: String(x.created_at ?? ""),
    deleted_at: x.deleted_at != null ? String(x.deleted_at) : null,
    display_name: x.display_name != null ? String(x.display_name) : null,
    byte_size: typeof x.byte_size === "number" ? x.byte_size : x.byte_size != null ? Number(x.byte_size) : null,
    tags: Array.isArray(tags) ? tags.map(String) : [],
  };
}

export async function listCmsMedia(
  supabase: SupabaseClient,
  limitOrOpts: number | ListCmsMediaOptions = 100,
): Promise<CmsMediaRow[]> {
  const opts: ListCmsMediaOptions =
    typeof limitOrOpts === "number" ? { limit: limitOrOpts } : limitOrOpts;
  const limit = opts.limit ?? 100;
  let q = supabase.from("cms_media").select("*");
  if (!opts.includeDeleted) {
    q = q.is("deleted_at", null);
  }
  if (opts.search?.trim()) {
    q = q.ilike("public_url", `%${opts.search.trim()}%`);
  }
  if (opts.mimePrefix?.trim()) {
    q = q.ilike("mime_type", `${opts.mimePrefix.trim()}%`);
  }
  if (opts.tag?.trim()) {
    q = q.contains("tags", [opts.tag.trim()]);
  }
  const sort = opts.sort ?? "created_desc";
  if (sort === "created_asc") q = q.order("created_at", { ascending: true });
  else if (sort === "name_asc") q = q.order("display_name", { ascending: true, nullsFirst: false });
  else if (sort === "name_desc") q = q.order("display_name", { ascending: false, nullsFirst: true });
  else q = q.order("created_at", { ascending: false });
  q = q.limit(limit);
  const { data, error } = await q;
  if (error) {
    if (isMissingTableOrSchemaError(error)) return [];
    console.error("[cms-media] list", error.message);
    return [];
  }
  return (data ?? []).map((r) => mapRow(r as Record<string, unknown>));
}

export async function getCmsMediaById(
  supabase: SupabaseClient,
  id: string,
): Promise<CmsMediaRow | null> {
  const { data, error } = await supabase.from("cms_media").select("*").eq("id", id).maybeSingle();
  if (error) {
    if (isMissingTableOrSchemaError(error)) return null;
    console.error("[cms-media] getById", error.message);
    return null;
  }
  if (!data) return null;
  return mapRow(data as Record<string, unknown>);
}

export async function insertCmsMedia(
  supabase: SupabaseClient,
  row: Omit<CmsMediaRow, "id" | "created_at" | "deleted_at" | "tags"> & {
    tags?: string[];
    byte_size?: number | null;
    display_name?: string | null;
  },
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
      display_name: row.display_name ?? null,
      byte_size: row.byte_size ?? null,
      tags: row.tags ?? [],
      created_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error) {
    console.error("[cms-media] insert", error.message);
    return null;
  }
  return mapRow(data as Record<string, unknown>);
}

export async function updateCmsMedia(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<Pick<CmsMediaRow, "alt_text" | "display_name" | "tags">>,
): Promise<CmsMediaRow | null> {
  const payload: Record<string, unknown> = {};
  if (patch.alt_text !== undefined) payload.alt_text = patch.alt_text;
  if (patch.display_name !== undefined) payload.display_name = patch.display_name;
  if (patch.tags !== undefined) payload.tags = patch.tags;
  if (Object.keys(payload).length === 0) return getCmsMediaById(supabase, id);
  const { data, error } = await supabase
    .from("cms_media")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();
  if (error) {
    console.error("[cms-media] update", error.message);
    return null;
  }
  return mapRow(data as Record<string, unknown>);
}

export async function softDeleteCmsMedia(supabase: SupabaseClient, id: string): Promise<boolean> {
  const { error } = await supabase
    .from("cms_media")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    console.error("[cms-media] softDelete", error.message);
    return false;
  }
  return true;
}

export type CmsMediaReferenceHit = { source: string; detail: string };

/** Best-effort text scan for public_url across CMS tables (admin only). */
export async function findCmsMediaReferences(
  supabase: SupabaseClient,
  publicUrl: string,
): Promise<CmsMediaReferenceHit[]> {
  const hits: CmsMediaReferenceHit[] = [];
  const needle = publicUrl.trim();
  if (!needle) return hits;

  const { data: pages } = await supabase.from("cms_pages").select("id, slug, locale, body, og_image_url");
  for (const p of pages ?? []) {
    const r = p as Record<string, unknown>;
    const blob = `${r.body ?? ""} ${r.og_image_url ?? ""}`;
    if (blob.includes(needle)) {
      hits.push({
        source: "cms_pages",
        detail: `${String(r.slug ?? "")} (${String(r.locale ?? "")})`,
      });
    }
  }

  const { data: cats } = await supabase
    .from("cms_category_content")
    .select("collection_handle, locale, intro_html, banner_url, blocks");
  for (const c of cats ?? []) {
    const r = c as Record<string, unknown>;
    const blob = JSON.stringify(r);
    if (blob.includes(needle)) {
      hits.push({
        source: "cms_category_content",
        detail: `${String(r.collection_handle ?? "")} (${String(r.locale ?? "")})`,
      });
    }
  }

  const { data: posts } = await supabase
    .from("cms_blog_posts")
    .select("slug, locale, body, excerpt, cover_image_url, og_image_url");
  for (const p of posts ?? []) {
    const r = p as Record<string, unknown>;
    const blob = `${r.body ?? ""}${r.excerpt ?? ""}${r.cover_image_url ?? ""}${r.og_image_url ?? ""}`;
    if (blob.includes(needle)) {
      hits.push({ source: "cms_blog_posts", detail: `${String(r.slug ?? "")} (${String(r.locale ?? "")})` });
    }
  }

  const { data: nav } = await supabase.from("cms_navigation").select("id, header_links, footer_columns");
  for (const n of nav ?? []) {
    const r = n as Record<string, unknown>;
    if (JSON.stringify(r).includes(needle)) {
      hits.push({ source: "cms_navigation", detail: String(r.id ?? "default") });
    }
  }

  return hits;
}
