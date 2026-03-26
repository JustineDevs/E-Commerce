import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingTableOrSchemaError } from "./supabase-errors";
import type { CmsNavigationPayload, CmsNavLink, CmsFooterColumn, CmsSocialLink } from "./cms-types";

const DEFAULT_ID = "default";

function parseLinks(v: unknown): CmsNavLink[] {
  if (!Array.isArray(v)) return [];
  const out: CmsNavLink[] = [];
  for (const x of v) {
    if (x && typeof x === "object" && "href" in x && "label" in x) {
      const r = x as Record<string, unknown>;
      out.push({
        href: String(r.href ?? ""),
        label: String(r.label ?? ""),
      });
    }
  }
  return out;
}

function parseFooter(v: unknown): CmsFooterColumn[] {
  if (!Array.isArray(v)) return [];
  const out: CmsFooterColumn[] = [];
  for (const x of v) {
    if (x && typeof x === "object" && "title" in x) {
      const r = x as Record<string, unknown>;
      out.push({
        title: String(r.title ?? ""),
        links: parseLinks(r.links),
      });
    }
  }
  return out;
}

function parseSocial(v: unknown): CmsSocialLink[] {
  if (!Array.isArray(v)) return [];
  const out: CmsSocialLink[] = [];
  for (const x of v) {
    if (x && typeof x === "object" && "href" in x && "label" in x) {
      const r = x as Record<string, unknown>;
      out.push({
        href: String(r.href ?? ""),
        label: String(r.label ?? ""),
        network: r.network != null ? String(r.network) : undefined,
      });
    }
  }
  return out;
}

export async function getCmsNavigationPayload(supabase: SupabaseClient): Promise<CmsNavigationPayload> {
  const { data, error } = await supabase
    .from("cms_navigation")
    .select("header_links, footer_columns, social_links")
    .eq("id", DEFAULT_ID)
    .maybeSingle();
  if (error) {
    if (isMissingTableOrSchemaError(error)) {
      return { headerLinks: [], footerColumns: [], socialLinks: [] };
    }
    console.error("[cms-navigation] getCmsNavigationPayload", error.message);
    return { headerLinks: [], footerColumns: [], socialLinks: [] };
  }
  if (!data) return { headerLinks: [], footerColumns: [], socialLinks: [] };
  const row = data as Record<string, unknown>;
  return {
    headerLinks: parseLinks(row.header_links),
    footerColumns: parseFooter(row.footer_columns),
    socialLinks: parseSocial(row.social_links),
  };
}

export async function upsertCmsNavigationPayload(
  supabase: SupabaseClient,
  payload: CmsNavigationPayload,
): Promise<void> {
  const { error } = await supabase.from("cms_navigation").upsert(
    {
      id: DEFAULT_ID,
      header_links: payload.headerLinks as unknown as Record<string, unknown>[],
      footer_columns: payload.footerColumns as unknown as Record<string, unknown>[],
      social_links: payload.socialLinks as unknown as Record<string, unknown>[],
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) throw new Error(error.message);
}
