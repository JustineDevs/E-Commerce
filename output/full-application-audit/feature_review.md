# Feature review

Classification key: **ALIGNED**, **COMPLETE**, **PARTIAL**, **FAKE**, **MISWIRED**, **DUPLICATED**, **FRAGILE**, **LEGACY-BACKED**, **UNSAFE**, **SAFE EXTENSION**, **UNKNOWN**.

## Commerce catalog (browse, PDP, search)

| Field | Assessment |
|-------|------------|
| Intended purpose | Medusa-backed product discovery and detail. |
| Implementation | Storefront uses Medusa SDK and route handlers under `apps/storefront/src/app` and `apps/storefront/src/lib/catalog-fetch*.ts`. |
| Read/write path | Read: Medusa Store API. Write: cart and checkout via Medusa, not Supabase product tables. |
| Wiring status | **ALIGNED** with `data-boundaries.ts`. |
| Gaps | **UNKNOWN** without runtime load tests for every list and filter combination. |
| Weaknesses | Network failures may surface as empty or generic errors depending on component. |
| Security | Public read surfaces; rate limits in `storefront-api-rate-limit` where applied. |
| UX | Trust depends on price and inventory accuracy from Medusa. |
| Recommendation | Add explicit "could not load catalog" vs "no products" states on shop listing. |

## Cart and checkout

| Field | Assessment |
|-------|------------|
| Intended purpose | Persistent Medusa cart, checkout, PSP sessions. |
| Implementation | `apps/storefront/src/lib/medusa-checkout.ts`, checkout client components, cart API routes. |
| Wiring status | **PARTIAL** to **COMPLETE** (PSP-specific). |
| Caveats | Multiple cart sync paths (anonymous, sign-in merge); race risk **FRAGILE**. |
| Sad paths | Empty cart, no shipping options, payment session creation failure. |
| Recommendation | E2E matrix per enabled provider; assert idempotency on cart merge. |

## BYOK / payment connections

| Field | Assessment |
|-------|------------|
| Intended purpose | Single ciphertext store in Supabase; admin CRUD; Medusa reads at boot when `PAYMENT_CREDENTIALS_SOURCE` is platform or supabase. |
| Implementation | `apps/admin/src/lib/payment-connections.ts`, `packages/payment-connection-crypto`, `apps/medusa/src/lib/apply-platform-payment-env.ts`, emitter script. |
| Wiring status | **SAFE EXTENSION** with **FRAGILE** boot coupling (`execFileSync`). |
| Security | Service role on Medusa host must be treated as tier-0 secret. |
| Recommendation | Document rotation runbook; consider async lazy load vs sync boot if startup SLO matters. |

## Staff admin and RBAC

| Field | Assessment |
|-------|------------|
| Intended purpose | Dashboard, CMS, POS, orders, settings. |
| Implementation | NextAuth; `apps/admin/src/middleware.ts` requires `admin` or `staff` for `/admin/*`, `/api/admin/*`, most `/api/integrations/*`. |
| Wiring status | **PARTIAL** (fine-grained page permissions may live in `require-page-permission` and route handlers; verify each route). |
| Sad paths | Wrong role, expired session, missing grant on specific API. |
| Recommendation | Automated tests for representative forbidden paths. |

## POS and terminal agent

| Field | Assessment |
|-------|------------|
| Intended purpose | In-store sales via Medusa; print and drawer via loopback agent. |
| Implementation | Admin POS routes under `apps/admin/src/app/api/pos/medusa/*`, `apps/terminal-agent`. |
| Wiring status | **PARTIAL** (offline queue and device sync add complexity). |
| Risks | Hardware and network assumptions; operator training. |

## CMS and static content

| Field | Assessment |
|-------|------------|
| Intended purpose | Pages, blog, navigation, redirects from Supabase-backed CMS. |
| Implementation | Admin CMS APIs; storefront `tryCmsRedirect` in `apps/storefront/middleware.ts`. |
| Wiring status | **PARTIAL**; **UNKNOWN** coverage of all content types. |

## Loyalty

| Field | Assessment |
|-------|------------|
| Intended purpose | Bridge ledger in Supabase keyed by Medusa customer. |
| Implementation | `loyalty_accounts` per `data-boundaries.ts`; admin and storefront routes. |
| Wiring status | **LEGACY-BACKED** bridge, **ALIGNED** if not duplicating order totals. |
| Risks | Reconciliation between ledger and Medusa discounts. |

## Reviews (UGC)

| Field | Assessment |
|-------|------------|
| Intended purpose | Product reviews keyed by Medusa product id. |
| Implementation | `product_reviews` bridge; storefront forms; admin moderation UI (per git status). |
| Wiring status | **PARTIAL**; moderation and spam **FRAGILE** without rate limits and auth checks verified per route. |

## Compliance and data subject tooling

| Field | Assessment |
|-------|------------|
| Intended purpose | Export and erasure across Supabase platform user and Medusa customer. |
| Implementation | `apps/api/src/routes/compliance.ts`, `requireInternalApiKey`, Medusa delete helpers. |
| Wiring status | **COMPLETE** for code path; **UNSAFE** if `INTERNAL_API_KEY` missing in non-production (documented warn). |

## Analytics and abandonment

| Field | Assessment |
|-------|------------|
| Intended purpose | Events and cart abandonment beacons. |
| Implementation | `apps/storefront/src/lib/analytics.ts` (lint warns unused stub parameters). |
| Wiring status | **PARTIAL** or **FAKE** for no-op trackers until wired; treat as **UNKNOWN** for production value until verified. |
