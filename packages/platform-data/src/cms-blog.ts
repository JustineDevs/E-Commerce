import type { SupabaseClient } from "@supabase/supabase-js";
import { isCmsPubliclyVisible } from "./cms-public-visibility";
import { isMissingTableOrSchemaError } from "./supabase-errors";
import type { CmsBlogPostRow, CmsPublishStatus } from "./cms-types";

function rowToBlog(r: Record<string, unknown>): CmsBlogPostRow {
  const tags = r.tags;
  return {
    id: String(r.id),
    slug: String(r.slug ?? ""),
    locale: String(r.locale ?? "en"),
    title: String(r.title ?? ""),
    excerpt: String(r.excerpt ?? ""),
    body: String(r.body ?? ""),
    cover_image_url: r.cover_image_url != null ? String(r.cover_image_url) : null,
    author_name: r.author_name != null ? String(r.author_name) : null,
    tags: Array.isArray(tags) ? tags.map(String) : [],
    status: (r.status as CmsPublishStatus) ?? "draft",
    published_at: r.published_at != null ? String(r.published_at) : null,
    scheduled_publish_at:
      r.scheduled_publish_at != null ? String(r.scheduled_publish_at) : null,
    preview_token: r.preview_token != null ? String(r.preview_token) : null,
    meta_title: r.meta_title != null ? String(r.meta_title) : null,
    meta_description: r.meta_description != null ? String(r.meta_description) : null,
    canonical_url: r.canonical_url != null ? String(r.canonical_url) : null,
    og_image_url: r.og_image_url != null ? String(r.og_image_url) : null,
    rss_include: r.rss_include === false ? false : true,
    json_ld: r.json_ld ?? null,
    created_at: String(r.created_at ?? ""),
    updated_at: String(r.updated_at ?? ""),
  };
}

export async function listCmsBlogPosts(supabase: SupabaseClient): Promise<CmsBlogPostRow[]> {
  const { data, error } = await supabase
    .from("cms_blog_posts")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) {
    if (isMissingTableOrSchemaError(error)) return [];
    console.error("[cms-blog] list", error.message);
    return [];
  }
  return (data ?? []).map((r) => rowToBlog(r as Record<string, unknown>));
}

export async function getCmsBlogPostBySlugAdmin(
  supabase: SupabaseClient,
  slug: string,
  locale: string,
): Promise<CmsBlogPostRow | null> {
  const { data, error } = await supabase
    .from("cms_blog_posts")
    .select("*")
    .eq("slug", slug)
    .eq("locale", locale)
    .maybeSingle();
  if (error) {
    if (isMissingTableOrSchemaError(error)) return null;
    console.error("[cms-blog] getCmsBlogPostBySlugAdmin", error.message);
    return null;
  }
  if (!data) return null;
  return rowToBlog(data as Record<string, unknown>);
}

export async function getCmsBlogPostById(
  supabase: SupabaseClient,
  id: string,
): Promise<CmsBlogPostRow | null> {
  const { data, error } = await supabase.from("cms_blog_posts").select("*").eq("id", id).maybeSingle();
  if (error) {
    if (isMissingTableOrSchemaError(error)) return null;
    console.error("[cms-blog] getById", error.message);
    return null;
  }
  if (!data) return null;
  return rowToBlog(data as Record<string, unknown>);
}

export type UpsertCmsBlogInput = Partial<CmsBlogPostRow> & {
  slug: string;
  title: string;
  locale?: string;
};

export async function upsertCmsBlogPost(
  supabase: SupabaseClient,
  input: UpsertCmsBlogInput,
): Promise<CmsBlogPostRow | null> {
  const locale = input.locale ?? "en";
  const existing = input.id
    ? await getCmsBlogPostById(supabase, input.id)
    : await getCmsBlogPostBySlugAdmin(supabase, input.slug, locale);

  const row = {
    slug: input.slug,
    locale,
    title: input.title,
    excerpt: input.excerpt ?? existing?.excerpt ?? "",
    body: input.body ?? existing?.body ?? "",
    cover_image_url:
      input.cover_image_url !== undefined ? input.cover_image_url : existing?.cover_image_url ?? null,
    author_name: input.author_name !== undefined ? input.author_name : existing?.author_name ?? null,
    tags: input.tags ?? existing?.tags ?? [],
    status: input.status ?? existing?.status ?? "draft",
    published_at: input.published_at !== undefined ? input.published_at : existing?.published_at ?? null,
    scheduled_publish_at:
      input.scheduled_publish_at !== undefined
        ? input.scheduled_publish_at
        : existing?.scheduled_publish_at ?? null,
    preview_token:
      input.preview_token !== undefined ? input.preview_token : existing?.preview_token ?? null,
    meta_title: input.meta_title !== undefined ? input.meta_title : existing?.meta_title ?? null,
    meta_description:
      input.meta_description !== undefined
        ? input.meta_description
        : existing?.meta_description ?? null,
    canonical_url:
      input.canonical_url !== undefined ? input.canonical_url : existing?.canonical_url ?? null,
    og_image_url:
      input.og_image_url !== undefined ? input.og_image_url : existing?.og_image_url ?? null,
    rss_include:
      input.rss_include !== undefined ? input.rss_include : existing?.rss_include ?? true,
    json_ld: input.json_ld !== undefined ? input.json_ld : existing?.json_ld ?? null,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    const { data, error } = await supabase
      .from("cms_blog_posts")
      .update(row)
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) {
      console.error("[cms-blog] update", error.message);
      return null;
    }
    return rowToBlog(data as Record<string, unknown>);
  }

  const { data, error } = await supabase
    .from("cms_blog_posts")
    .insert({
      ...row,
      created_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error) {
    console.error("[cms-blog] insert", error.message);
    return null;
  }
  return rowToBlog(data as Record<string, unknown>);
}

export async function deleteCmsBlogPost(supabase: SupabaseClient, id: string): Promise<boolean> {
  const { error } = await supabase.from("cms_blog_posts").delete().eq("id", id);
  if (error) {
    console.error("[cms-blog] delete", error.message);
    return false;
  }
  return true;
}

export async function getCmsBlogPostBySlugPublic(
  supabase: SupabaseClient,
  slug: string,
  locale: string,
): Promise<CmsBlogPostRow | null> {
  const { data, error } = await supabase
    .from("cms_blog_posts")
    .select("*")
    .eq("slug", slug)
    .eq("locale", locale)
    .maybeSingle();
  if (error) {
    if (isMissingTableOrSchemaError(error)) return null;
    console.error("[cms-blog] getCmsBlogPostBySlugPublic", error.message);
    return null;
  }
  if (!data) return null;
  const post = rowToBlog(data as Record<string, unknown>);
  if (!isCmsPubliclyVisible(post.status, post.scheduled_publish_at)) {
    return null;
  }
  return post;
}

export async function listCmsBlogPostsPublic(
  supabase: SupabaseClient,
  locale: string,
  limit = 30,
): Promise<CmsBlogPostRow[]> {
  const { data, error } = await supabase
    .from("cms_blog_posts")
    .select("*")
    .eq("locale", locale)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) {
    if (isMissingTableOrSchemaError(error)) return [];
    console.error("[cms-blog] listCmsBlogPostsPublic", error.message);
    return [];
  }
  const now = Date.now();
  return (data ?? [])
    .map((r) => rowToBlog(r as Record<string, unknown>))
    .filter((p) => isCmsPubliclyVisible(p.status, p.scheduled_publish_at, now));
}

export async function listCmsBlogPostsForSitemapPublic(
  supabase: SupabaseClient,
): Promise<{ slug: string; locale: string; updated_at: string }[]> {
  const { data, error } = await supabase
    .from("cms_blog_posts")
    .select("slug, locale, updated_at, status, scheduled_publish_at");
  if (error) {
    if (isMissingTableOrSchemaError(error)) return [];
    console.error("[cms-blog] listCmsBlogPostsForSitemapPublic", error.message);
    return [];
  }
  const now = Date.now();
  return (data ?? [])
    .map((r) => {
      const x = r as Record<string, unknown>;
      return {
        slug: String(x.slug ?? ""),
        locale: String(x.locale ?? "en"),
        updated_at: String(x.updated_at ?? ""),
        status: (x.status as CmsBlogPostRow["status"]) ?? "draft",
        scheduled_publish_at:
          x.scheduled_publish_at != null ? String(x.scheduled_publish_at) : null,
      };
    })
    .filter((r) => isCmsPubliclyVisible(r.status, r.scheduled_publish_at, now))
    .map(({ slug, locale, updated_at }) => ({ slug, locale, updated_at }));
}

export async function getCmsBlogPostBySlugPreview(
  supabase: SupabaseClient,
  slug: string,
  locale: string,
  previewToken: string,
): Promise<CmsBlogPostRow | null> {
  const { data, error } = await supabase
    .from("cms_blog_posts")
    .select("*")
    .eq("slug", slug)
    .eq("locale", locale)
    .eq("preview_token", previewToken)
    .maybeSingle();
  if (error) {
    if (isMissingTableOrSchemaError(error)) return null;
    console.error("[cms-blog] preview", error.message);
    return null;
  }
  if (!data) return null;
  return rowToBlog(data as Record<string, unknown>);
}
