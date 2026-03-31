import { z } from "zod";

export {
  cartMergePostBodySchema,
  cmsFormSubmissionPayloadSchema,
  complianceEmailParamSchema,
  internalCustomerDataErasureBodySchema,
  internalCustomerDataExportBodySchema,
  medusaCartIdSchema,
  medusaResourceIdSchema,
  storefrontProductSlugSchema,
  storefrontReviewPostBodySchema,
  storefrontReviewsListQuerySchema,
} from "./http-schemas";

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

/** Philippine mobile: +639XXXXXXXXX, 639XXXXXXXXX, 09XXXXXXXXX, or 9XXXXXXXXX (10 digits after 9). */
export function isPhilippinesMobilePhone(raw: string): boolean {
  const t = raw.replace(/[\s-]/g, "");
  return /^(\+639|639|09|9)\d{9}$/.test(t);
}

export const storefrontShippingAddressSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().trim().max(60).optional(),
  fullName: z.string().trim().min(1).max(120),
  phone: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .refine((v) => isPhilippinesMobilePhone(v), {
      message: "Use a Philippine mobile (+63 or 09XXXXXXXXX).",
    }),
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(1).max(100),
  province: z.string().trim().min(1).max(100),
  postalCode: z.string().trim().max(20).optional(),
  country: z
    .string()
    .trim()
    .toUpperCase()
    .length(2)
    .default("PH"),
});

export type StorefrontShippingAddress = z.infer<
  typeof storefrontShippingAddressSchema
>;

export const storefrontCustomerProfilePatchSchema = z
  .object({
    displayName: z.string().trim().max(120).optional(),
    phone: z.string().trim().max(40).optional(),
    shippingAddresses: z.array(storefrontShippingAddressSchema).max(5).optional(),
  })
  .superRefine((data, ctx) => {
    const ph = data.phone?.trim();
    if (ph && !isPhilippinesMobilePhone(ph)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Use a Philippine mobile (+63 or 09XXXXXXXXX).",
        path: ["phone"],
      });
    }
  });

export type StorefrontCustomerProfilePatch = z.infer<
  typeof storefrontCustomerProfilePatchSchema
>;
