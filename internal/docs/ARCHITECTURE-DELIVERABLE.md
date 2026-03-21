# Apparel Commerce Platform: Architecture Deliverable

Senior full-stack architect output per /repo-map, /rules, /review, /trace, /spec, /sprint, /ZSPS, /ui.

---

## 1. Goal

Build a production-ready apparel e-commerce platform for a shorts/clothing business with:
- **Customer storefront (Maharlika: Grand Custom)**: home, shop, PDP, client-side bag, checkout (Lemon Squeezy handoff), tracking, account; **browser UI** uses Maharlika metadata, favicon/icon set, and horizontal logo in **nav + footer** (`apps/storefront`).
- Admin dashboard (inventory, orders, POS; analytics shell as needed)
- OMS with shared inventory source of truth
- Philippines-friendly shipping (J&T Express via AfterShip)
- Lemon Squeezy payments
- Google OAuth for staff and customers

**Brand assets (storefront)** 
- Horizontal wordmark: source `apparel-commerce/public/Maharlika Logo Design.png` → copied/served as `apps/storefront/public/brand/maharlika-logo-horizontal.png`. 
- Favicon / touch icons / manifest: generated from `Maharlika Logo Design (abstract).png` into `apps/storefront/public/icons/` (sizes 16–512 + `apple-touch-icon` 180×180); regenerate with `pnpm --filter @apparel-commerce/storefront generate:icons`. 
- SEO `metadataBase`: set **`NEXT_PUBLIC_SITE_URL`** in production. Documented in `internal/docs/SKILLS-RUNBOOK.md` (`ui-ux-pro-max` sizing alignment).

**Stakeholder intake (authoritative business form)** 
Structured answers from **Maharlika Apparel Custom** are captured in `internal/docs/exclusive/Apparel Business Requirement Form.csv`. The file on disk is a **ZIP container** whose entry `Apparel Business Requirement Form.csv` holds the real comma-separated export (Google Forms). Use Python/`zipfile` or unzip once if you need a flat `.csv` on the filesystem. The same facts are summarized in **`internal/docs/spec.md` §15** (requirements vs as-built gaps).

---

## 2. Repo Map (Current Structure)

```
E-commerce Website/
├── apparel-commerce/ # Monorepo root
│ ├── public/ # Repo-level brand sources (Maharlika PNGs); also used by icon script
│ ├── apps/
│ │ ├── storefront/ # Next.js 15 App Router: Maharlika chrome, catalog, checkout, track
│ │ │ ├── public/brand/ # maharlika-logo-horizontal.png (served to users)
│ │ │ ├── public/icons/ # favicon*, apple-touch-icon, android-chrome, site.webmanifest
│ │ │ ├── scripts/ # generate-favicons.py (+ Pillow)
│ │ │ └── e2e/ # Playwright smoke (storefront + optional API)
│ │ ├── admin/ # Next.js App Router, dashboard + BFF `/api/backend`
│ │ ├── api/ # Express: catalog, checkout, orders, inventory, webhooks, jobs (legacy until Medusa cutover)
│ │ └── medusa/ # Medusa 2.x backend: target system of record (see MEDUSA-MIGRATION-PROGRAM.md)
│ ├── packages/
│ │ ├── ui/ # Shared UI package (placeholder exports; most UI is app-local)
│ │ ├── types/ # Domain types (Product, orders, etc.)
│ │ ├── validation/ # Zod schemas
│ │ ├── database/ # Supabase client, queries, seed.sql, migrations/
│ │ ├── config/ # TypeScript, ESLint, Tailwind presets
│ │ └── sdk/ # getApiUrl(), internal API headers helper
│ ├── playwright.config.ts # E2E at monorepo root (storefront app)
│ ├── dogfood-output/ # Manual/agent-browser QA notes
│ ├── package.json
│ ├── pnpm-workspace.yaml
│ └── turbo.json
├── internal/docs/
│ ├── spec.md, blueprint.md, privacy-terms.md
│ ├── OWASP-ASSESSMENT.md # Top 10 mapping to code paths (not a compliance cert)
│ ├── SKILLS-RUNBOOK.md # skills-lock.json → commands (e2e, dogfood, ui-ux icons)
│ ├── migration/field-mapping.md # Legacy Supabase export → Medusa (catalog + inventory)
│ ├── runbooks/cutover.md, runbooks/rollback.md
│ └── ARCHITECTURE-DELIVERABLE.md (this file)
├── skills-lock.json # Pinned skill sources (hashes)
└── .cursor/
 ├── rules/
 ├── commands/
 └── llm/
```

---

## 3. Wiring Health Map (Trace)

| Flow | Hop | Status | Notes |
|------|-----|--------|-------|
| Storefront: Product list | Shop → `GET /products` | **WIRED** | SSR/ISR against API |
| Storefront: Product detail | PDP → `GET /products/:slug` | **WIRED** | Add-to-bag → client cart |
| Storefront: Cart / bag | `lib/cart` (localStorage) + checkout | **WIRED** | No separate `/reservations` route; stock reserved in **`POST /checkout`** order creation |
| Storefront: Checkout | Storefront → `POST /checkout` → Lemon Squeezy URL | **WIRED** | Requires `LEMONSQUEEZY_*` + DB; optional **Resend** email with signed tracking URL when email present + `RESEND_*` set |
| Storefront: Order tracking | `/track/[orderId]?t=` → `GET /public/orders/:id?t=` | **WIRED** | Scoped token; no internal key on anonymous routes |
| API → Transact email | `POST /checkout` → `sendCheckoutTrackingEmail` | **WIRED** | **Resend** (`resend` npm); skipped when `RESEND_API_KEY` / `RESEND_FROM_EMAIL` unset |
| Admin: Inventory | Dashboard → API `GET /inventory` (internal key) | **WIRED** | BFF or server fetch with key |
| Admin: Orders hub | `GET /orders` (internal key) | **WIRED** | List + filters |
| Admin: POS | Barcode → `POST /barcode/lookup`, commit → `POST /orders` | **WIRED** | Client uses `/api/backend` proxy pattern |
| API: Lemon Squeezy webhook | `POST /webhooks/lemonsqueezy` | **WIRED** | HMAC verify + DB idempotency (`@apparel-commerce/database`) |
| API: AfterShip webhook | `POST /webhooks/aftership` | **WIRED** | HMAC verify + `shipments` upsert |
| Admin: Order fulfillment | `/admin/orders/[orderId]` | **WIRED** | Line items, **POST** shipments (BFF), **PATCH** order status (mark shipped / delivered) |
| Admin BFF | `PATCH /api/backend/orders/...` | **WIRED** | Proxies to API with session + internal key |
| API: Payments router | `apps/api/.../payments.ts` | **STUB** | Checkout creation lives under **`/checkout`** + LS lib, not `/payments` |
| Auth | NextAuth → Google | **PARTIAL** | Provider wired; full Supabase user sync / RBAC as needed |
| Database | `seed.sql` + migrations | **WIRED** | Align production with migration workflow |

---

## 4. Rules Compliance

- .cursor/rules/: production.mdc (branch flow), rules.mdc (clean code), maintainer.mdc (PR flow) reviewed
- .cursor/wiki/: Not present
- .cursor/skills/: .claude/skills/ storefront-best-practices, authentication-setup applicable
- .cursor/llm/: Lemon Squeezy, AfterShip docs indexed

---

## 5. Architecture Decisions

1. **Single inventory source**: product_variants + inventory_movements + stock_reservations. Web and POS both use the same services.
2. **Webhook idempotency**: webhook_events table with (provider, event_id) unique. Replay-safe.
3. **Order item snapshots**: SKU, size, color, product name, unit price stored at purchase time. Catalog changes do not mutate history.
4. **Lemon Squeezy as payment truth**: Order marked paid only after verified webhook, never from client redirect.
5. **AfterShip + jtexpress-ph**: Carrier slug fixed for Philippines. Tracking page reads from shipments table.
6. **NextAuth + Supabase users**: Custom adapter or callbacks required to sync Google user into public.users and enforce role.
7. **Repository/service pattern**: API routes delegate to services; services use Supabase client from packages/database.

---

## 6. Database Schema

From packages/database/supabase/seed.sql:

- users, addresses
- products, product_images, product_variants
- inventory_locations, inventory_movements, stock_reservations
- orders, order_items
- payments, shipments
- webhook_events

Enums: user_role, order_channel, order_status, payment_status, shipment_status, inventory_reason.

Note: `seed.sql` bootstraps schema and demo data. **`packages/database/supabase/migrations/`** (e.g. `enable_rls.sql`) should be the source of truth for production evolves; use `supabase db push` / your migrate workflow.

---

## 7. API Routes (Implemented vs planned)

**Mounted today** (`apps/api/src/index.ts`):

| Method | Path | Purpose | Notes |
|--------|------|---------|--------|
| GET | /health | Liveness + DB probe | |
| GET | /public/orders/:identifier | Order + shipments for tracking | **Signed `?t=`**; rate limited; no internal key |
| GET | /products | List products | |
| GET | /products/:slug | Product + variants | |
| POST | /checkout | Web checkout: reserve stock, create pending order, LS checkout URL | **Primary** web payment entry; not `/payments/checkout` |
| GET | /inventory | List inventory + stock | Internal API key |
| GET | /inventory/available/:variantId | Available qty | Internal API key |
| POST | /orders | Create order (e.g. POS) | Internal API key |
| GET | /orders | List orders | Internal API key |
| GET | /orders/:id | Order by UUID or order number | Internal API key |
| GET | /shipments/order/:orderId | Shipments for order | Internal API key |
| POST | /shipments | Staff: create shipment + bump `paid` → `ready_to_ship` | Internal API key |
| PATCH | /orders/:id | Staff: order status transitions | Internal API key; UUID only |
| POST | /barcode/lookup | Variant lookup | |
| POST | /jobs/release-expired-reservations | Release TTL reservations | Operational |
| GET | /compliance/export?email= | Data-subject export bundle | Internal API key |
| POST | /compliance/retention/anonymize-addresses | Anonymize stale order addresses | Internal API key |
| POST | /webhooks/lemonsqueezy | LS events | Raw body + signature |
| POST | /webhooks/aftership | Tracking events | Raw body + HMAC |

**Still thin / optional**

| Method | Path | Purpose |
|--------|------|---------|
| * | /payments/* | Router present; checkout logic is under **`/checkout`** |
| PATCH | /orders/:id/status | Staff status transitions (if not yet exposed) |

**Historical note:** Stock reservation for web checkout is handled inside **`createPendingCheckoutOrder`** (database layer) invoked from **`POST /checkout`**, not a standalone `POST /reservations` route.

---

## 8. Core logic placement

**Pattern:** Most domain operations live in **`packages/database`** (queries + transactional helpers). Express routes are thin wrappers (auth, validation, HTTP).

| Concern | Where it lives |
|---------|----------------|
| Catalog | `listProducts`, `getProductBySlug`, etc. |
| Inventory & reservations | Availability, `createPendingCheckoutOrder`, movements, `releaseExpiredReservations` |
| Orders | `createOrder`, `listOrders`, `getOrderById`, web order numbering |
| Checkout / LS | `apps/api` `checkout.ts` + `lib/lemonsqueezy.ts`; webhook in `webhooks.lemonsqueezy.ts` + DB webhook processor |
| Shipments / AfterShip | `webhooks.aftership.ts` + DB helpers; `shipments` routes; `order-fulfillment.ts` (`createStaffShipment`, `updateOrderStatusStaff`) |
| Checkout email | `apps/api/src/lib/checkoutEmail.ts` (Resend HTML template with tracking URL) |
| Barcode | `barcode` route + DB lookup |
| Compliance | `compliance` route + export / anonymize helpers in DB package |

---

## 9. UI Pages (Required)

**Storefront (Maharlika chrome: `StorefrontNav`, `StorefrontFooter`, root `layout` metadata + icons)**
- / Home
- /shop Product listing
- /shop/[slug] PDP with size/color picker, add to bag → client cart
- /checkout Bag + email → `POST /checkout` → Lemon Squeezy
- /track Track lookup entry (order + token or pasted URL)
- /track/[orderId] Order + shipment timeline (`GET /public/orders` + `?t=` token)
- /account Customer account (NextAuth surface as implemented)

**Admin**
- /admin Dashboard
- /admin/inventory Inventory table, movements
- /admin/orders Orders hub (links to detail)
- /admin/orders/[orderId] Fulfillment: line items, register tracking, mark shipped / delivered
- /admin/pos Barcode scan, order creation, payment link

---

## 10. Sprint Plan

### Committed (status vs plan)

| Item | Deliverable | Owner | Files | Dependencies | Proof / status |
|------|-------------|-------|------|--------------|----------------|
| Day 1: Repo bootstrap | Env, schema, auth base | Dev | .env.example, seed.sql, NextAuth route | None | **Done**: dev stack runs |
| Day 2: Catalog + inventory | Product APIs, inventory UI | Dev | apps/api, packages/database, admin/inventory | Day 1 | **Done**: `GET /products`, admin inventory |
| Day 3: Storefront | Home, shop, PDP, bag, checkout handoff | Dev | apps/storefront | Day 2 | **Done**: Maharlika chrome, `POST /checkout` → LS |
| Day 4: Webhooks + POS | Payment webhook, POS, barcode | Dev | webhooks.*, POS page | Day 3 | **Done**: LS + AfterShip handlers; POS wired |
| Day 5: Shipments + tracking | Orders hub, track page | Dev | shipments routes, track UI | Day 4 | **Done**: `/track/[orderId]` |
| Day 6: QA | E2E, hardening, staging | Dev | Playwright, SECURITY.md, jobs | Day 5 | **In progress**: `pnpm test:e2e`, dogfood report |
| Day 7: UAT + launch | Production deploy, SOP | Dev | main, env audit | Day 6 | Pending go-live |

### Blocked

None. All items are implementable with current stack.

### Future Considerations

- RLS policies on Supabase for multi-tenant
- Low-stock worker integration (worker file exists, not wired)
- Receipt printing for POS
- Multi-location inventory transfers
- SMS / other channels for tracking alerts (intake asks for SMS + email; email via Resend when configured)

---

## 11. Step-by-Step Implementation (Sprint Slices)

### Slice 1: Products API + Storefront Shop

**Files to create/update:**

1. `packages/database/src/queries/products.ts` - listProducts, getProductBySlug
2. `apps/api/src/routes/products.ts` - GET /products, GET /products/:slug
3. `apps/api/src/index.ts` - mount productsRouter
4. `apps/storefront/src/app/(public)/shop/page.tsx` - fetch products, grid
5. `packages/types/src/index.ts` - Product, ProductVariant types

### Slice 2: Inventory + stock (current)

1. `packages/database`: availability, reservations, movements (used by checkout and orders)
2. `apps/api/src/routes/inventory.ts`: `GET /inventory`, `GET /inventory/available/:variantId`
3. `apps/api/src/routes/jobs.ts`: `POST /jobs/release-expired-reservations`
4. ~~Standalone `POST /reservations`~~: not exposed; reservation TTL is part of **`POST /checkout`** / order flows in DB layer

### Slice 3: Orders + checkout flow (current)

1. `packages/database`: `createOrder`, `createPendingCheckoutOrder`, list/get orders
2. `apps/api/src/routes/orders.ts`: `POST /`, `GET /`, `GET /:id` (internal key)
3. `apps/api/src/routes/checkout.ts`: `POST /checkout` + Lemon Squeezy checkout creation (`lib/lemonsqueezy`)
4. `apps/api/src/routes/payments.ts`: placeholder for future **payment link** / POS-specific payment helpers
5. Storefront `checkout/page.tsx`: reads bag, **`POST /checkout`**, redirects to LS

### Slice 4: Lemon Squeezy Webhook

1. `apps/api/src/routes/webhooks.lemonsqueezy.ts`: verified signature on raw body, idempotent processing via `@apparel-commerce/database` (`processLemonSqueezyOrderWebhook` / related helpers)
2. Order paid + inventory finalisation: handled in database package as part of webhook processing (no separate `payments.service.ts` file required)

### Slice 5: POS + Barcode

1. `packages/database` (or API lib): barcode / variant resolution used by `POST /barcode/lookup`
2. `apps/api/src/routes/barcode.ts`: `POST /barcode/lookup`
3. Admin POS page: barcode/SKU input, cart, order commit via BFF + API

### Slice 6: AfterShip + Tracking

1. `apps/api/src/routes/webhooks.aftership.ts`: POST handler, verify HMAC, idempotency, shipment updates via `@apparel-commerce/database`
2. `apps/api/src/routes/shipments.ts`: `GET /shipments/order/:orderId`, `POST /shipments` (staff)
3. Storefront `/track/[orderId]`: `GET /public/orders/:id?t=` (no internal key)
4. Admin `/admin/orders/[orderId]`: fulfillment panel + BFF `PATCH` / `POST`

### Slice 7: Checkout transactional email

1. `apps/api/src/lib/checkoutEmail.ts`: Resend HTML with signed tracking URL
2. `POST /checkout`: after pending order + LS URL, async send when buyer email + `RESEND_*` present

---

## 12. Acceptance Checklist

- [x] Storefront: Home, shop grid, PDP with variants, add to bag (client cart)
- [x] Storefront: Checkout calls `POST /checkout` and redirects to Lemon Squeezy (with env)
- [x] Storefront: Track page loads order + shipments via signed token (`/public/orders`)
- [x] Storefront: Maharlika branding: nav/footer logo, favicon set, manifest, metadata title
- [x] Admin: Inventory table backed by `GET /inventory`
- [x] Admin: Orders hub backed by `GET /orders`
- [x] Admin: POS: barcode lookup + order create (paths implemented; payment link UX may evolve)
- [x] API: Lemon Squeezy webhook: signature + handler wired
- [x] API: AfterShip webhook: signature + handler wired
- [ ] Auth: Google OAuth + strict role-based admin access + Supabase user sync (harden per SECURITY.md)
- [ ] Production hardening: env audit, RLS, rate limits, monitoring: see `SECURITY.md` / exclusive findings
- [ ] Remove or implement remaining **STUB** routes (e.g. `/payments` placeholder) before calling payments “complete”

---

## 13. Env Variables (Centralized)

**Medusa SOR (see `SOP-MEDUSA-ENV-AND-LEGACY.md`, `SOP-SINGLE-SOURCE-OF-TRUTH.md`):** `apps/medusa/.env` holds **Medusa** `DATABASE_URL` (dedicated Postgres), `JWT_SECRET`, `COOKIE_SECRET`, `REDIS_URL`, CORS, Lemon/AfterShip keys for Medusa modules — **not** the legacy Supabase schema in `packages/database`. **Root** `apparel-commerce/.env`: `NEXT_PUBLIC_*` only for browser-safe values; server secrets without `NEXT_PUBLIC_`. Run `pnpm verify:public-env` on template changes.

| Variable | Purpose |
|----------|---------|
| DATABASE_URL | **Legacy** Supabase Postgres (`packages/database`) — not Medusa’s DB |
| SUPABASE_URL | Supabase project URL |
| SUPABASE_SERVICE_ROLE_KEY | Server-side Supabase access |
| NEXTAUTH_URL | NextAuth base URL |
| NEXTAUTH_SECRET | NextAuth signing |
| GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET | Google OAuth |
| LEMONSQUEEZY_API_KEY, LEMONSQUEEZY_STORE_ID, LEMONSQUEEZY_WEBHOOK_SECRET | Lemon Squeezy |
| AFTERSHIP_API_KEY, AFTERSHIP_WEBHOOK_SECRET | AfterShip |
| API_URL | Node API base URL (server-side SSR for storefront/admin) |
| NEXT_PUBLIC_API_URL | Browser-facing API URL (checkout fetch, etc.) |
| NEXT_PUBLIC_SITE_URL | Canonical site URL for `metadataBase` (Open Graph / absolute URLs) |
| INTERNAL_API_KEY | Required in production; secures admin/list/get order + inventory |
| TRACKING_LINK_SECRET | HMAC for public tracking links |
| PUBLIC_STOREFRONT_URL | Absolute links in API-generated emails (fallback: `NEXT_PUBLIC_SITE_URL`) |
| RESEND_API_KEY, RESEND_FROM_EMAIL, RESEND_BRAND_NAME | Transactional mail (checkout tracking link) |
| CORS_ORIGIN | Allowed origins for API |

| Medusa / storefront (root `.env`; see `.env.example`) | Purpose |
|----------|---------|
| `NEXT_PUBLIC_COMMERCE_SOURCE` | `medusa` when Medusa is SOR; `legacy` only for migration testing |
| `NEXT_PUBLIC_MEDUSA_URL`, `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`, `NEXT_PUBLIC_MEDUSA_REGION_ID` | Store API (browser-safe) |
| `MEDUSA_BACKEND_URL` | Optional server SSR override for Medusa base URL |
| `LEGACY_EXPRESS_WEBHOOKS_DISABLED` | Express: `true` → 410 on `/webhooks/lemonsqueezy` and `/webhooks/aftership` only (`SOP-MEDUSA-ENV-AND-LEGACY` §4.3) |
| `LEGACY_COMMERCE_API_DISABLED` | Express: set `true` only after Lemon/AfterShip webhooks target Medusa; disables all listed legacy commerce routes |

---

## 14. Spec Compliance (Final Verdict)

**As of last doc update**

| Area | Status |
|------|--------|
| Monorepo, Turbo, packages | Implemented |
| Database schema + seed | Implemented (production: migrate from seed-only workflow as needed) |
| Storefront catalog, PDP, Maharlika UI chrome | Implemented |
| Web checkout + LS redirect | Implemented (configuration-dependent) |
| Webhooks (LS, AfterShip) | Implemented (secrets required) |
| Admin inventory, orders, POS | Largely implemented |
| Auth / RBAC / RLS | Partial: continue hardening |
| `/payments` Express router | Stub: not the primary checkout path |

**Spec drift:** None material; **implementation completeness** has moved well past “skeleton only.” Remaining work is **operational hardening**, **authz**, and **closing stub surfaces** (e.g. payments router) to match production bar.
