import { createClient } from "@supabase/supabase-js";
import { getCmsNavigationPayload } from "./cms-navigation";
import { listCmsAnnouncementsForLocalePublic } from "./cms-announcement";
import {
  getCmsPageBySlugLocalePublic,
  getCmsPageBySlugPreview,
  listCmsPagesForSitemapPublic,
} from "./cms-pages";
import {
  getCmsBlogPostBySlugPublic,
  listCmsBlogPostsPublic,
  listCmsBlogPostsForSitemapPublic,
} from "./cms-blog";
import { getCmsCategoryContentPublic } from "./cms-category";
import { listCmsAbExperiments } from "./cms-experiments";
import type {
  CmsPageRow,
  CmsBlogPostRow,
  CmsNavigationPayload,
} from "./cms-types";
import type { CmsAnnouncementRow } from "./cms-announcement";
import type { CmsCategoryContentRow } from "./cms-category";
import type { CmsAbExperimentRow } from "./cms-experiments";

function anonClient() {
  const url = process.env.SUPABASE_URL?.trim();
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return null;
  return createClient(url, anonKey);
}

export async function loadCmsPagePublic(slug: string, locale = "en"): Promise<CmsPageRow | null> {
  const sb = anonClient();
  if (!sb) return null;
  return getCmsPageBySlugLocalePublic(sb, slug, locale);
}

export async function loadCmsPagePreviewPublic(
  slug: string,
  previewToken: string,
  locale = "en",
): Promise<CmsPageRow | null> {
  const sb = anonClient();
  if (!sb) return null;
  const token = previewToken.trim();
  if (!token) return null;
  return getCmsPageBySlugPreview(sb, slug, locale, token);
}

export async function loadCmsNavigationPublic(): Promise<CmsNavigationPayload> {
  const sb = anonClient();
  if (!sb)
    return {
      headerLinks: [],
      headerLinksMobile: [],
      footerColumns: [],
      footerBottomLinks: [],
      socialLinks: [],
    };
  return getCmsNavigationPayload(sb);
}

const DEFAULT_CMS_LOCALE = (process.env.NEXT_PUBLIC_CMS_LOCALE ?? "en").trim() || "en";

/** Active announcement bars for a locale (stacking rules applied). */
export async function loadCmsAnnouncementsPublic(locale = DEFAULT_CMS_LOCALE): Promise<CmsAnnouncementRow[]> {
  const sb = anonClient();
  if (!sb) return [];
  return listCmsAnnouncementsForLocalePublic(sb, locale);
}

/** @deprecated Prefer loadCmsAnnouncementsPublic (returns stacked list). */
export async function loadCmsAnnouncementPublic(): Promise<CmsAnnouncementRow | null> {
  const rows = await loadCmsAnnouncementsPublic(DEFAULT_CMS_LOCALE);
  return rows[0] ?? null;
}

export async function loadCmsCategoryContentPublic(
  collectionHandle: string,
  locale = "en",
): Promise<CmsCategoryContentRow | null> {
  const sb = anonClient();
  if (!sb) return null;
  return getCmsCategoryContentPublic(sb, collectionHandle, locale);
}

export async function loadCmsBlogListPublic(locale = "en"): Promise<CmsBlogPostRow[]> {
  const sb = anonClient();
  if (!sb) return [];
  return listCmsBlogPostsPublic(sb, locale, 40);
}

export async function loadCmsBlogPostPublic(slug: string, locale = "en"): Promise<CmsBlogPostRow | null> {
  const sb = anonClient();
  if (!sb) return null;
  return getCmsBlogPostBySlugPublic(sb, slug, locale);
}

export async function loadCmsAbExperimentsActivePublic(): Promise<CmsAbExperimentRow[]> {
  const sb = anonClient();
  if (!sb) return [];
  const rows = await listCmsAbExperiments(sb);
  const now = Date.now();
  return rows.filter((r) => {
    if (!r.active) return false;
    if (r.starts_at && new Date(r.starts_at).getTime() > now) return false;
    if (r.ends_at && new Date(r.ends_at).getTime() < now) return false;
    return true;
  });
}

export async function loadCmsSitemapEntries(): Promise<{
  pages: { slug: string; locale: string; updated_at: string }[];
  posts: { slug: string; locale: string; updated_at: string }[];
}> {
  const sb = anonClient();
  if (!sb) return { pages: [], posts: [] };
  const [pages, posts] = await Promise.all([
    listCmsPagesForSitemapPublic(sb),
    listCmsBlogPostsForSitemapPublic(sb),
  ]);
  return { pages, posts };
}
