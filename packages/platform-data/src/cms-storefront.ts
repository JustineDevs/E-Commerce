import { createClient } from "@supabase/supabase-js";
import { getCmsNavigationPayload } from "./cms-navigation";
import { getCmsAnnouncement } from "./cms-announcement";
import {
  getCmsPageBySlugLocalePublic,
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

export async function loadCmsNavigationPublic(): Promise<CmsNavigationPayload> {
  const sb = anonClient();
  if (!sb) return { headerLinks: [], footerColumns: [], socialLinks: [] };
  return getCmsNavigationPayload(sb);
}

export async function loadCmsAnnouncementPublic(): Promise<CmsAnnouncementRow | null> {
  const sb = anonClient();
  if (!sb) return null;
  return getCmsAnnouncement(sb);
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
  return listCmsAbExperiments(sb);
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
