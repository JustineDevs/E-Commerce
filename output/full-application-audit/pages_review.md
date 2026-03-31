# Pages review

Focus on high-traffic and high-risk surfaces. Classifications use the same vocabulary as `feature_review.md`.

## Storefront `/` (home)

| Field | Notes |
|-------|-------|
| Purpose | Marketing and entry to shop. |
| Wiring | Often CMS or static plus Medusa teasers; **PARTIAL** without tracing each block. |
| Missing states | CMS timeout vs empty content. |
| Recommendation | Explicit skeleton and error for Medusa-backed tiles. |

## Storefront `/shop`, `/shop/[slug]`

| Field | Notes |
|-------|-------|
| Purpose | Listing and PDP. |
| Wiring | Medusa reads; **ALIGNED** if helpers enforce region and publishable keys only on client where required. |
| Edge cases | Slug not found, variant missing, unpublished product. |
| Misleading behavior | Stale cache or CDN could show old price; **FRAGILE**. |

## Storefront `/checkout`

| Field | Notes |
|-------|-------|
| Purpose | Payment and order creation. |
| Wiring | **CRITICAL PATH**; **PARTIAL** until each PSP path is proven in runtime tests. |
| Sad paths | Session expiry mid-checkout, double submit, shipping option disappearance. |

## Storefront `/sign-in`, `/register`, `/account/*`

| Field | Notes |
|-------|-------|
| Purpose | Customer auth and orders. |
| Middleware | `apps/storefront/middleware.ts` requires token for `/account`. |
| Edge cases | Token valid in one tab and revoked in another; **FRAGILE**. |

## Admin `/admin` and dashboard children

| Field | Notes |
|-------|-------|
| Purpose | Operations hub. |
| Auth | Middleware role check; additional page-level checks may apply. |
| Misleading | Widgets that call Medusa or Supabase without visible error banners on failure. |

## Admin `/admin/settings/payments`

| Field | Notes |
|-------|-------|
| Purpose | Payment connections and BYOK. |
| Wiring | **CENTRAL** to platform secrets; must match Medusa env modes. |
| Operator confusion | Mixing file-based Medusa env with platform source without documenting precedence. |

## Admin `/admin/pos`

| Field | Notes |
|-------|-------|
| Purpose | In-store selling. |
| Risks | Device binding, offline queue, duplicate commit; **FRAGILE**. |

## Admin `/sign-in`

| Field | Notes |
|-------|-------|
| Purpose | Staff authentication. |
| Wiring | Separate NextAuth instance from storefront; **DUPLICATED** pattern by design, not same cookie domain necessarily. |

## Error and legal pages (`/privacy`, `/terms`, `/errors/[code]`)

| Field | Notes |
|-------|-------|
| Purpose | Compliance and UX safety net. |
| Wiring | Mostly static or CMS; low risk unless links are wrong. |
