import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isMissingTableOrSchemaError } from "./supabase-errors";

/** One home-page tile (Shorts / Shirts / Jackets style blocks). */
export type StorefrontHomeTile = {
  href: string;
  title: string;
  linkLabel: string;
  /** Shown on the wide tile only (e.g. Jackets). */
  subtitle?: string;
  /** Optional image URL (https). Empty = solid background. */
  imageUrl: string;
  /** Maps to layout + text treatment in the storefront. */
  variant: "large" | "small" | "wide";
};

export type StorefrontHomePayload = {
  hero: {
    line1: string;
    line2: string;
    lead: string;
    showPrivacyLink: boolean;
    ctaLabel: string;
    ctaHref: string;
    imageUrl: string;
  };
  tiles: [StorefrontHomeTile, StorefrontHomeTile, StorefrontHomeTile];
  latestSection: {
    title: string;
    viewAllLabel: string;
    viewAllHref: string;
  };
  newsletter: {
    title: string;
    body: string;
    placeholder: string;
    buttonLabel: string;
  };
};

export const DEFAULT_STOREFRONT_HOME_PAYLOAD: StorefrontHomePayload = {
  hero: {
    line1: "MAHARLIKA",
    line2: "APPAREL CUSTOM",
    lead:
      "Maharlika Apparel Custom is an online store for custom shorts, shirts, and jackets. Browse, order, and track shipments.",
    showPrivacyLink: true,
    ctaLabel: "Shop Now",
    ctaHref: "/shop",
    imageUrl: "",
  },
  tiles: [
    {
      href: "/shop?category=Shorts",
      title: "Shorts",
      linkLabel: "Explore Collection",
      imageUrl: "",
      variant: "large",
    },
    {
      href: "/shop?category=Shirt",
      title: "Shirts",
      linkLabel: "Shop shirts",
      imageUrl: "",
      variant: "small",
    },
    {
      href: "/shop?category=Jacket",
      title: "Jackets",
      subtitle: "Layers & outerwear",
      linkLabel: "",
      imageUrl: "",
      variant: "wide",
    },
  ],
  latestSection: {
    title: "THE LATEST DROP",
    viewAllLabel: "View All Products",
    viewAllHref: "/shop",
  },
  newsletter: {
    title: "STAY WITH MAHARLIKA",
    body: "New drops, restocks, and studio notes from Maharlika Apparel Custom.",
    placeholder: "email@address.com",
    buttonLabel: "Subscribe",
  },
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function pickString(r: Record<string, unknown>, key: string, fallback: string): string {
  const v = r[key];
  return typeof v === "string" ? v : fallback;
}

function pickBool(r: Record<string, unknown>, key: string, fallback: boolean): boolean {
  const v = r[key];
  return typeof v === "boolean" ? v : fallback;
}

function mergeHero(partial: unknown): StorefrontHomePayload["hero"] {
  const d = DEFAULT_STOREFRONT_HOME_PAYLOAD.hero;
  if (!isRecord(partial)) return { ...d };
  return {
    line1: pickString(partial, "line1", d.line1),
    line2: pickString(partial, "line2", d.line2),
    lead: pickString(partial, "lead", d.lead),
    showPrivacyLink: pickBool(partial, "showPrivacyLink", d.showPrivacyLink),
    ctaLabel: pickString(partial, "ctaLabel", d.ctaLabel),
    ctaHref: pickString(partial, "ctaHref", d.ctaHref),
    imageUrl: pickString(partial, "imageUrl", d.imageUrl),
  };
}

function mergeTile(
  partial: unknown,
  fallback: StorefrontHomeTile,
): StorefrontHomeTile {
  if (!isRecord(partial)) return { ...fallback };
  const variantRaw = partial.variant;
  const variant: StorefrontHomeTile["variant"] =
    variantRaw === "large" || variantRaw === "small" || variantRaw === "wide"
      ? variantRaw
      : fallback.variant;
  const subtitle = partial.subtitle;
  return {
    href: pickString(partial, "href", fallback.href),
    title: pickString(partial, "title", fallback.title),
    linkLabel: pickString(partial, "linkLabel", fallback.linkLabel),
    subtitle: typeof subtitle === "string" ? subtitle : fallback.subtitle,
    imageUrl: pickString(partial, "imageUrl", fallback.imageUrl),
    variant,
  };
}

function mergeTiles(raw: unknown): StorefrontHomePayload["tiles"] {
  const d = DEFAULT_STOREFRONT_HOME_PAYLOAD.tiles;
  if (!Array.isArray(raw)) return d;
  return [
    mergeTile(raw[0], d[0]),
    mergeTile(raw[1], d[1]),
    mergeTile(raw[2], d[2]),
  ] as StorefrontHomePayload["tiles"];
}

function mergeLatest(partial: unknown): StorefrontHomePayload["latestSection"] {
  const d = DEFAULT_STOREFRONT_HOME_PAYLOAD.latestSection;
  if (!isRecord(partial)) return { ...d };
  return {
    title: pickString(partial, "title", d.title),
    viewAllLabel: pickString(partial, "viewAllLabel", d.viewAllLabel),
    viewAllHref: pickString(partial, "viewAllHref", d.viewAllHref),
  };
}

function mergeNewsletter(partial: unknown): StorefrontHomePayload["newsletter"] {
  const d = DEFAULT_STOREFRONT_HOME_PAYLOAD.newsletter;
  if (!isRecord(partial)) return { ...d };
  return {
    title: pickString(partial, "title", d.title),
    body: pickString(partial, "body", d.body),
    placeholder: pickString(partial, "placeholder", d.placeholder),
    buttonLabel: pickString(partial, "buttonLabel", d.buttonLabel),
  };
}

function cloneDefaultPayload(): StorefrontHomePayload {
  return JSON.parse(JSON.stringify(DEFAULT_STOREFRONT_HOME_PAYLOAD)) as StorefrontHomePayload;
}

/** Merges stored JSON with defaults so missing keys still render. */
export function mergeStorefrontHomePayload(raw: unknown): StorefrontHomePayload {
  if (!isRecord(raw)) {
    return cloneDefaultPayload();
  }
  return {
    hero: mergeHero(raw.hero),
    tiles: mergeTiles(raw.tiles),
    latestSection: mergeLatest(raw.latestSection),
    newsletter: mergeNewsletter(raw.newsletter),
  };
}

const ROW_ID = "default";

export async function getStorefrontHomeContent(
  supabase: SupabaseClient,
): Promise<StorefrontHomePayload> {
  const { data, error } = await supabase
    .from("storefront_home_content")
    .select("payload")
    .eq("id", ROW_ID)
    .maybeSingle();

  if (error) {
    if (!isMissingTableOrSchemaError(error)) {
      console.error("[storefront-home-cms] getStorefrontHomeContent", error.message);
    }
    return mergeStorefrontHomePayload(null);
  }

  const payload = (data as { payload?: unknown } | null)?.payload;
  return mergeStorefrontHomePayload(payload ?? {});
}

export async function upsertStorefrontHomeContent(
  supabase: SupabaseClient,
  payload: StorefrontHomePayload,
): Promise<void> {
  const merged = mergeStorefrontHomePayload(payload);
  const { error } = await supabase.from("storefront_home_content").upsert(
    {
      id: ROW_ID,
      payload: merged as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Loads home CMS for the public storefront using the anon key (RLS allows SELECT).
 * Returns built-in defaults when Supabase is not configured or the query fails.
 */
export async function loadStorefrontHomeContentForPublic(): Promise<StorefrontHomePayload> {
  const url = process.env.SUPABASE_URL?.trim();
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) {
    return mergeStorefrontHomePayload(null);
  }
  try {
    const sb = createClient(url, anonKey);
    return await getStorefrontHomeContent(sb);
  } catch (e) {
    console.warn("[storefront-home-cms] loadStorefrontHomeContentForPublic", e);
    return mergeStorefrontHomePayload(null);
  }
}
