# Components review

Grouped by concern. Evidence paths point to representative files; exhaustive listing is not practical in one pass.

## Storefront cart and product

| Group | Role | Dependencies | Risks |
|-------|------|--------------|-------|
| `AddToCartSection`, `CatalogProductCard` | Purchase entry | Medusa cart APIs, pricing | Optimistic UI vs server rejection; **FRAGILE** |
| `checkout-client.tsx` | Checkout flow | Medusa checkout helpers, PSP widgets | State desync on back button; **PARTIAL** |

## Storefront trust and reviews

| Group | Role | Risks |
|-------|------|-------|
| `ProductReviewForm`, `ProductReviewsSection` | UGC | Spam, XSS if markdown or HTML mishandled; validate server-side in `apps/storefront/src/app/api/reviews` |

## Storefront global

| Group | Role | Risks |
|-------|------|-------|
| `CartSyncOnSignIn`, `CartAbandonmentBeacon` | Session and marketing | Duplicate events; privacy notice |
| `StorefrontFooter`, layout | Navigation | Broken links to CMS pages |

## Admin shell

| Group | Role | Risks |
|-------|------|-------|
| `AdminSidebar`, `AdminCommandPalette` | Navigation | Type-only param names fixed for ESLint (`onOpenChange` callback type) |
| `PaymentConnectionsManager` | BYOK UX | Operators may paste secrets into logs if errors echo input; verify redaction |

## Admin catalog (new)

| Group | Role | Risks |
|-------|------|-------|
| `catalog/*`, `VariantOptionField` | Product editing | Medusa admin API vs custom BFF; **MISWIRED** risk if fields map wrong |

## Admin POS

| Group | Role | Risks |
|-------|------|-------|
| POS client components | Sale completion | Double submit, drawer open after failed Medusa commit |

## Cross-cutting recommendations

1. Standardize error boundary components per app (one pattern for "retry" and "contact support").
2. Remove or prefix unused callback parameters (`_action`) to satisfy `no-unused-vars` and reduce noise.
3. Loading states should not mimic success (no fake checkmarks until server ack).
