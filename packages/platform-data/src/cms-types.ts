export type CmsPageType = "static" | "landing" | "legal";
export type CmsPublishStatus = "draft" | "published" | "scheduled";

/** Optional promo tile shown next to a mega-menu column. */
export type CmsNavFeatured = {
  href: string;
  label: string;
  imageUrl?: string;
};

/**
 * Header/footer link. Optional `children` powers desktop mega menus.
 * `startsAt` / `endsAt` are ISO timestamps; omitted links are filtered at read time on the storefront.
 */
export type CmsNavLink = {
  href: string;
  label: string;
  badge?: string;
  iconKey?: string;
  children?: CmsNavLink[];
  featured?: CmsNavFeatured;
  startsAt?: string;
  endsAt?: string;
};

export type CmsFooterColumn = {
  title: string;
  links: CmsNavLink[];
};

export type CmsSocialLink = { href: string; label: string; network?: string };

export type CmsNavigationPayload = {
  headerLinks: CmsNavLink[];
  /** When non-empty, used for the compact / mobile nav instead of top-level header links. */
  headerLinksMobile: CmsNavLink[];
  footerColumns: CmsFooterColumn[];
  /** Thin bar below main footer columns (legal, region, etc.). */
  footerBottomLinks: CmsNavLink[];
  socialLinks: CmsSocialLink[];
};

export type CmsBlock = {
  id: string;
  type: string;
  props: Record<string, unknown>;
};

export type CmsPageRow = {
  id: string;
  slug: string;
  locale: string;
  page_type: CmsPageType;
  title: string;
  body: string;
  blocks: CmsBlock[];
  status: CmsPublishStatus;
  published_at: string | null;
  scheduled_publish_at: string | null;
  preview_token: string | null;
  meta_title: string | null;
  meta_description: string | null;
  canonical_url: string | null;
  og_image_url: string | null;
  json_ld: unknown | null;
  version: number;
  created_at: string;
  updated_at: string;
  /** Optional parent CMS page slug for breadcrumbs. */
  parent_slug: string | null;
  /** Optional shorter crumb label (defaults to title). */
  breadcrumb_label: string | null;
};

export type CmsPageBlockPresetRow = {
  id: string;
  name: string;
  blocks: CmsBlock[];
  created_at: string;
};

export type CmsBlogPostRow = {
  id: string;
  slug: string;
  locale: string;
  title: string;
  excerpt: string;
  body: string;
  cover_image_url: string | null;
  author_name: string | null;
  tags: string[];
  status: CmsPublishStatus;
  published_at: string | null;
  scheduled_publish_at: string | null;
  preview_token: string | null;
  meta_title: string | null;
  meta_description: string | null;
  canonical_url: string | null;
  og_image_url: string | null;
  rss_include: boolean;
  json_ld: unknown | null;
  created_at: string;
  updated_at: string;
};
