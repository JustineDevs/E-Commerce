import { z } from "zod";

// Shared validation schemas

export const productListSortSchema = z.enum(["newest", "name_asc", "price_asc", "price_desc"]);

export const productListQuerySchema = z.object({
  limit: z.coerce
    .number()
    .transform((n) => Math.floor(n))
    .pipe(z.number().int().min(1).max(100))
    .optional(),
  offset: z.coerce
    .number()
    .transform((n) => Math.floor(n))
    .pipe(z.number().int().min(0).max(50_000))
    .optional(),
  category: z.string().trim().min(1).max(120).optional(),
  size: z.string().trim().min(1).max(40).optional(),
  color: z.string().trim().min(1).max(80).optional(),
  brand: z.string().trim().min(1).max(120).optional(),
  minPrice: z.coerce
    .number()
    .optional()
    .transform((n) =>
      n != null && Number.isFinite(n) && n >= 0 ? n : undefined,
    ),
  maxPrice: z.coerce
    .number()
    .optional()
    .transform((n) =>
      n != null && Number.isFinite(n) && n >= 0 ? n : undefined,
    ),
  /** Search product name or slug (ilike). */
  q: z.preprocess((val) => {
    if (val == null || val === "") return undefined;
    const raw = Array.isArray(val) ? val[0] : val;
    if (typeof raw !== "string") return undefined;
    const t = raw.trim();
    return t.length === 0 ? undefined : t.slice(0, 80);
  }, z.string().min(1).max(80).optional()),
  sort: productListSortSchema.optional(),
});

export type ProductListQuery = z.infer<typeof productListQuerySchema>;

export const orderStatusSchema = z.enum([
  "draft",
  "pending_payment",
  "paid",
  "ready_to_ship",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
]);

export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const orderChannelSchema = z.enum(["web", "pos"]);
export type OrderChannel = z.infer<typeof orderChannelSchema>;

export const userRoleSchema = z.enum(["admin", "staff", "customer"]);
export type UserRole = z.infer<typeof userRoleSchema>;

/** Default page size for shop product listing (matches storefront shop page). */
export const SHOP_PRODUCT_PAGE_SIZE = 20;
