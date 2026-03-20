import { z } from "zod";

// Shared validation schemas

export const productListSortSchema = z.enum(["newest", "name_asc", "price_asc", "price_desc"]);

export const productListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).max(50_000).optional(),
  category: z.string().trim().min(1).max(120).optional(),
  size: z.string().trim().min(1).max(40).optional(),
  color: z.string().trim().min(1).max(80).optional(),
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
