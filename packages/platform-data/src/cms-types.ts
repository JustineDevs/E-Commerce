export type CmsPageType = "static" | "landing" | "legal";
export type CmsPublishStatus = "draft" | "published" | "scheduled";

export type CmsNavLink = { href: string; label: string };

export type CmsFooterColumn = {
  title: string;
  links: CmsNavLink[];
};

export type CmsSocialLink = { href: string; label: string; network?: string };

export type CmsNavigationPayload = {
  headerLinks: CmsNavLink[];
  footerColumns: CmsFooterColumn[];
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
  json_ld: unknown | null;
  created_at: string;
  updated_at: string;
};
