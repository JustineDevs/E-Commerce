// Shared domain types (catalog / storefront Product shape from Medusa mapping)

// ---------------------------------------------------------------------------
// Payment connection types (shared between admin UI and Medusa emitter)
// ---------------------------------------------------------------------------

export type PaymentProvider =
  | "stripe"
  | "paypal"
  | "paymongo"
  | "maya"
  | "cod"
  | "aftership";

export type PaymentConnectionMode = "sandbox" | "production";

export type PaymentConnectionStatus =
  | "enabled"
  | "sandbox_verified"
  | "disabled"
  | "pending";

export type PaymentWebhookStatus = "verified" | "unverified" | "not_applicable";

export type StripeSecrets = {
  provider: "stripe";
  secretKey: string;
  webhookSecret?: string;
};

export type PayPalSecrets = {
  provider: "paypal";
  clientId: string;
  clientSecret: string;
  webhookId?: string;
  environment?: "sandbox" | "live";
};

export type PayMongoSecrets = {
  provider: "paymongo";
  secretKey: string;
  webhookSecret?: string;
};

export type MayaSecrets = {
  provider: "maya";
  secretKey: string;
  webhookSecret?: string;
};

export type CodSecrets = {
  provider: "cod";
};

/** Aftership tracking API + webhook signing (courier integrations, same BYOK storage as payments). */
export type AftershipSecrets = {
  provider: "aftership";
  apiKey: string;
  webhookSecret?: string;
  /** Aftership courier slug (e.g. jtexpress-ph). */
  courierSlug?: string;
};

export type ProviderSecrets =
  | StripeSecrets
  | PayPalSecrets
  | PayMongoSecrets
  | MayaSecrets
  | CodSecrets
  | AftershipSecrets;

export type PaymentConnectionRow = {
  id: string;
  provider: PaymentProvider;
  region_id: string | null;
  status: PaymentConnectionStatus;
  mode: PaymentConnectionMode;
  secret_ciphertext: string;
  crypto_scheme: string | null;
  kek_key_id: string | null;
  key_version: number | null;
  webhook_status: PaymentWebhookStatus;
  secret_hint: string | null;
  secret_rotated_at: string | null;
  created_at: string;
  updated_at: string;
};

export interface ProductImage {
  id: string;
  productId: string;
  imageUrl: string;
  sortOrder: number;
}

/** Ordered hero media for PDP carousel (images from Medusa + videos from metadata). */
export type ProductGallerySlide =
  | { kind: "image"; url: string }
  | { kind: "video"; url: string };

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  barcode: string | null;
  size: string;
  color: string;
  price: number;
  compareAtPrice: number | null;
  cost: number | null;
  /** Medusa `manage_inventory !== false` (undefined treated as tracked). */
  manageInventory: boolean;
  /** From Store API `+variants.inventory_quantity`; null when omitted. */
  inventoryQuantity: number | null;
  /** Sellable on the storefront (in stock or not inventory-managed). */
  isActive: boolean;
}

/** Clickable region on a lifestyle image linking to another product PDP. */
export interface ProductImageHotspot {
  xPct: number;
  yPct: number;
  productSlug: string;
  label?: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string | null;
  status: string;
  brand: string | null;
  /** ISO timestamp when present (for sort). */
  createdAt: string | null;
  images: ProductImage[];
  /** Combined image + video slides for the product page gallery. */
  gallerySlides: ProductGallerySlide[];
  variants: ProductVariant[];
  /** From Medusa product metadata (single source of truth in commerce DB). */
  videoUrl: string | null;
  weightKg: number | null;
  dimensionsLabel: string | null;
  material: string | null;
  /** Optional lifestyle hero image URL with clickable hotspots. */
  lifestyleImageUrl: string | null;
  hotspots: ProductImageHotspot[];
  /** Related product handles for cross-sell (same category or explicit list). */
  relatedHandles: string[];
  /** SEO helper stored in metadata; storefront can prefer over auto-truncated description. */
  seoDescription: string | null;
}
