# Apparel Commerce Platform: Architecture Deliverable

Senior full-stack architect output per /repo-map, /rules, /review, /trace, /spec, /sprint, /ZSPS, /ui.

---

## 1. Goal

Build a production-ready apparel e-commerce platform for a shorts/clothing business with:
- Customer storefront (home, shop, PDP, cart, checkout, tracking, account)
- Admin dashboard (analytics, inventory, orders, POS)
- OMS with shared inventory source of truth
- Philippines-friendly shipping (J&T Express via AfterShip)
- Lemon Squeezy payments
- Google OAuth for staff and customers

---

## 2. Repo Map (Current Structure)

```
E-commerce Website/
├── apparel-commerce/           # Monorepo root
│   ├── apps/
│   │   ├── storefront/         # Next.js App Router, public storefront
│   │   ├── admin/             # Next.js App Router, internal dashboard
│   │   └── api/               # Node.js + Express, webhooks, services
│   ├── packages/
│   │   ├── ui/                # Shared components (empty)
│   │   ├── types/             # Domain types (OrderStatus, OrderChannel, UserRole)
│   │   ├── validation/       # Zod schemas (orderStatusSchema)
│   │   ├── database/         # Supabase client, seed.sql
│   │   ├── config/           # TypeScript, ESLint, Tailwind
│   │   └── sdk/              # getApiUrl() only
│   ├── package.json
│   ├── pnpm-workspace.yaml
│   └── turbo.json
├── internal/docs/
│   ├── spec.md
│   ├── blueprint.md
│   ├── privacy-terms.md
│   └── ARCHITECTURE-DELIVERABLE.md (this file)
└── .cursor/
    ├── rules/                 # production.mdc, rules.mdc, maintainer.mdc
    ├── commands/             # trace, spec, sprint, ZSPS, ui, etc.
    └── llm/                  # Lemon Squeezy, AfterShip docs
```

---

## 3. Wiring Health Map (Trace)

| Flow | Hop | Status | Notes |
|------|-----|--------|-------|
| Storefront: Product list | Shop page -> API/products | WIRED | Slice 1 implemented |
| Storefront: Product detail | PDP -> API/products/:slug | WIRED | Slice 1 implemented |
| Storefront: Add to cart | Cart -> API/reservations | BROKEN | No cart UI, no reservation API |
| Storefront: Checkout | Checkout -> Lemon Squeezy | BROKEN | Checkout placeholder, no payment link creation |
| Storefront: Order tracking | Track page -> API/shipments | BROKEN | Track page placeholder |
| Admin: Inventory table | Inventory page -> API/inventory | BROKEN | Page placeholder, inventory routes empty |
| Admin: Orders hub | Orders page -> API/orders | BROKEN | Page placeholder, orders routes empty |
| Admin: POS | POS page -> API/barcode, API/orders | BROKEN | POS placeholder, barcode service empty |
| API: Lemon Squeezy webhook | POST /webhooks/lemonsqueezy | BROKEN | Empty router |
| API: AfterShip webhook | POST /webhooks/aftership | BROKEN | Empty router |
| Auth | NextAuth -> Google | PARTIAL | Google provider wired, no Supabase users sync |
| Database | seed.sql | WIRED | Schema complete, types match |

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

Note: seed.sql creates schema and types. For production, split into migrations (e.g. 001_initial.sql) and run via supabase db push or migrate tool.

---

## 7. API Routes (Required)

| Method | Path | Purpose |
|--------|------|---------|
| GET | /health | Liveness |
| GET | /products | List products (paginated) |
| GET | /products/:slug | Product with variants |
| GET | /inventory/available/:variantId | Available qty for variant |
| POST | /reservations | Create/update reservation |
| POST | /orders | Create order (web or POS) |
| GET | /orders/:id | Order detail |
| PATCH | /orders/:id/status | Update status (staff) |
| POST | /payments/checkout | Create Lemon Squeezy checkout URL |
| POST | /payments/link | Create payment link (POS) |
| GET | /shipments/order/:orderId | Shipments for order |
| POST | /barcode/lookup | Lookup variant by barcode |
| POST | /webhooks/lemonsqueezy | Lemon Squeezy webhook |
| POST | /webhooks/aftership | AfterShip webhook |

---

## 8. Core Services

| Service | Responsibility |
|---------|----------------|
| inventory.service | Reserve, release, commit sale, get available qty |
| orders.service | Create order, add items, transition status |
| payments.service | Create checkout URL, create payment link, verify webhook |
| shipments.service | Create shipment, update from AfterShip |
| barcode.service | Lookup variant by barcode |

---

## 9. UI Pages (Required)

**Storefront**
- / Home
- /shop Product listing
- /shop/[slug] PDP with size/color picker, add to cart
- /checkout Checkout with address, handoff to Lemon Squeezy
- /track/[orderId] Tracking from shipments
- /account Customer account

**Admin**
- /admin Dashboard
- /admin/inventory Inventory table, movements
- /admin/orders Orders hub, status updates
- /admin/pos Barcode scan, order creation, payment link

---

## 10. Sprint Plan

### Committed

| Item | Deliverable | Owner | Files | Dependencies | Proof |
|------|-------------|-------|------|--------------|-------|
| Day 1: Repo bootstrap | Env, schema, auth base | Dev | .env.example, seed.sql, NextAuth route | None | pnpm dev runs, auth works |
| Day 2: Catalog + inventory | Product APIs, variant mgmt, inventory UI | Dev | apps/api, packages/database, admin/inventory | Day 1 | Products list, inventory table |
| Day 3: Storefront | Home, shop, PDP, cart, checkout handoff | Dev | apps/storefront, packages/ui | Day 2 | Add to cart, redirect to LS |
| Day 4: Webhooks + POS | Payment webhook, order state, POS, barcode | Dev | webhooks.lemonsqueezy, orders.service, pos page | Day 3 | Webhook marks paid, POS creates order |
| Day 5: Shipments + tracking | Orders hub, AfterShip, track page | Dev | webhooks.aftership, shipments.service, track page | Day 4 | Track page shows status |
| Day 6: QA | Webhook replay, role checks, staging | Dev | Tests, staging deploy | Day 5 | All flows pass |
| Day 7: UAT + launch | Production deploy, SOP handoff | Dev | main merge, docs | Day 6 | Live |

### Blocked

None. All items are implementable with current stack.

### Future Considerations

- RLS policies on Supabase for multi-tenant
- Low-stock worker integration (worker file exists, not wired)
- Receipt printing for POS
- Multi-location inventory transfers

---

## 11. Step-by-Step Implementation (Sprint Slices)

### Slice 1: Products API + Storefront Shop

**Files to create/update:**

1. `packages/database/src/queries/products.ts` - listProducts, getProductBySlug
2. `apps/api/src/routes/products.ts` - GET /products, GET /products/:slug
3. `apps/api/src/index.ts` - mount productsRouter
4. `apps/storefront/src/app/(public)/shop/page.tsx` - fetch products, grid
5. `packages/types/src/index.ts` - Product, ProductVariant types

### Slice 2: Inventory Service + Reservation API

1. `apps/api/src/services/inventory.service.ts` - getAvailableQty, createReservation, releaseReservation, commitSale
2. `apps/api/src/routes/inventory.ts` - GET /inventory/available/:variantId
3. `apps/api/src/routes/reservations.ts` - POST /reservations
4. Mount reservations router

### Slice 3: Orders Service + Checkout Flow

1. `apps/api/src/services/orders.service.ts` - createOrder, addOrderItems, updateStatus
2. `apps/api/src/routes/orders.ts` - POST /orders, GET /orders/:id
3. `apps/api/src/services/payments.service.ts` - createCheckoutUrl (Lemon Squeezy SDK)
4. `apps/api/src/routes/payments.ts` - POST /payments/checkout
5. Storefront checkout page: collect address, call API, redirect to Lemon Squeezy

### Slice 4: Lemon Squeezy Webhook

1. `apps/api/src/routes/webhooks.lemonsqueezy.ts` - POST handler, verify signature, idempotency via webhook_events, call payments.service.handlePaymentWebhook
2. `apps/api/src/services/payments.service.ts` - handlePaymentWebhook: mark order paid, convert reservations to sale

### Slice 5: POS + Barcode

1. `apps/api/src/services/barcode.service.ts` - lookupByBarcode
2. `apps/api/src/routes/barcode.ts` - POST /barcode/lookup
3. Admin POS page: barcode input, variant display, quantity, create order, payment link

### Slice 6: AfterShip + Tracking

1. `apps/api/src/routes/webhooks.aftership.ts` - POST handler, verify, idempotency, update shipments
2. `apps/api/src/services/shipments.service.ts` - createShipment, updateFromWebhook
3. `apps/api/src/routes/shipments.ts` - GET /shipments/order/:orderId
4. Storefront track page: fetch shipments, display status

---

## 12. Acceptance Checklist

- [ ] Storefront: Home, shop grid, PDP with variants, add to cart
- [ ] Storefront: Checkout redirects to Lemon Squeezy
- [ ] Storefront: Track page shows shipment status
- [ ] Admin: Inventory table with movements
- [ ] Admin: Orders hub with status updates
- [ ] Admin: POS barcode lookup, order creation, payment link
- [ ] API: Lemon Squeezy webhook verifies, marks paid, commits inventory
- [ ] API: AfterShip webhook updates shipment status
- [ ] Auth: Google OAuth, role-based access to admin
- [ ] No MOCK, TODO, or STUB in production paths

---

## 13. Env Variables (Centralized)

| Variable | Purpose |
|----------|---------|
| DATABASE_URL | Supabase Postgres connection |
| SUPABASE_URL | Supabase project URL |
| SUPABASE_SERVICE_ROLE_KEY | Server-side Supabase access |
| NEXTAUTH_URL | NextAuth base URL |
| NEXTAUTH_SECRET | NextAuth signing |
| GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET | Google OAuth |
| LEMONSQUEEZY_API_KEY, LEMONSQUEEZY_STORE_ID, LEMONSQUEEZY_WEBHOOK_SECRET | Lemon Squeezy |
| AFTERSHIP_API_KEY, AFTERSHIP_WEBHOOK_SECRET | AfterShip |
| API_URL | Node API base URL |
| CORS_ORIGIN | Allowed origin for API |

---

## 14. Spec Compliance (Final Verdict)

Checklist Items:
- Implemented: 2 (repo structure, database schema)
- Blocked: 0
- Not Done: 15+ (storefront pages, admin pages, API services, webhooks, auth sync)

Spec Drift Detected: No. Scope matches spec; implementation is incomplete.
