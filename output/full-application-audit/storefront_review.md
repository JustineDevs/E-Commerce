# Storefront review

## Browse

- Medusa region and pricing drive list cards. Empty states must distinguish errors.
- Search and filters: **PARTIAL** confidence without reading every query param path.

## PDP

- Variant selection and inventory: trust Medusa; oversell risk is Medusa inventory config responsibility.
- SEO: `apps/storefront/src/lib/seo.ts` shapes metadata; wrong env base URL harms canonical URLs. **FRAGILE**.

## Price and variant logic

- Must match Medusa tax-inclusive rules per region; **UNKNOWN** without comparing to Medusa config.

## Cart

- Multiple API routes (`merge`, `attach-customer`, `resume`, `medusa-bind`). **DUPLICATED** logic risk across handlers; consolidation recommended over time.

## Checkout

- Largest customer-facing risk surface. Payment session creation errors must be actionable (retry vs contact support).
- **Sad path:** user refreshes during PSP redirect; order and cart state must reconcile.

## Payment flow

- Depends on enabled Medusa providers and storefront integration. BYOK must mirror Medusa env at runtime.

## Shipping

- Options from Medusa; none available is a common failure; message must be clear.

## Tracking

- AfterShip or similar if wired; `TRACKING_HMAC_SECRET` warning means unsigned links are weaker. **SECURITY** note in `validate-process-env.ts`.

## Customer-facing edge cases

- Wishlist, preferences: Supabase or local; must not claim persistence if offline.
- Guest vs signed-in: cart merge edge cases.

## Trust and UX issues

- Showing "secure checkout" badges without TLS and PSP readiness is misleading; avoid.
- Third-party scripts removed or changed (e.g. Clarity per git status); verify analytics story matches privacy policy pages.

## Integrity gaps

- Client-side price display vs server capture amount must match Medusa final cart; tampering should not lower price if Medusa validates server-side.

## Sad paths

- Medusa 503: global error page or per-section fallback.
- Invalid slug: 404 vs soft 404.
