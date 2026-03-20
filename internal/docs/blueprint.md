Here is a clean production-ready blueprint for your shorts/apparel business sprint, built around one shared monorepo, one transactional Postgres database, hosted payments, and carrier-based tracking for J&T Express Philippines. Use Next.js App Router for the storefront and internal surfaces, a separate Node API for webhooks and background jobs, Supabase Postgres as the source of truth, and Turborepo with pnpm workspaces for shared packages and predictable delivery flow. [nextjs](https://nextjs.org/docs/app)

## Stack

The goal is one catalog, one inventory ledger, and one order pipeline for both web and POS sales. [supabase](https://supabase.com/docs)

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Next.js App Router  [nextjs](https://nextjs.org/docs/app) | Storefront, account pages, admin, and POS UI in one React-based routing model. [nextjs](https://nextjs.org/docs/app) |
| API / Jobs | Node.js + Express  [docs.lemonsqueezy](https://docs.lemonsqueezy.com/api/webhooks/create-webhook) | Handles Lemon Squeezy webhooks, AfterShip syncs, barcode actions, and long-running background jobs. [docs.lemonsqueezy](https://docs.lemonsqueezy.com/api/webhooks/create-webhook) |
| Database | Supabase Postgres  [supabase](https://supabase.com/docs) | Single source of truth for products, variants, orders, inventory, shipments, and auth-linked app data. [supabase](https://supabase.com/docs) |
| Monorepo | Turborepo + pnpm workspaces  [turborepo](https://turborepo.dev) | Shares types, UI, validation, and API clients across storefront, admin, and server packages. [turborepo](https://turborepo.dev) |
| UI | Tailwind CSS + shadcn/ui  [tailwindcss](https://tailwindcss.com) | Fast UI development with composable, customizable components for both customer and internal screens. [tailwindcss](https://tailwindcss.com) |
| Payments | Lemon Squeezy server SDK + Lemon.js  [npmjs](https://www.npmjs.com/package/@lemonsqueezy/lemonsqueezy.js?activeTab=readme) | Hosted checkout, payment links, tax handling, and signed payment webhooks. [docs.lemonsqueezy](https://docs.lemonsqueezy.com/api/webhooks/create-webhook) |
| Shipping | AfterShip Tracking + linked J&T account  [aftership](https://www.aftership.com/carriers/jtexpress-ph/api) | Tracking creation, normalized shipment statuses, and J&T Express Philippines support. [aftership](https://www.aftership.com/carriers/jtexpress-ph/api) |
| Auth | NextAuth/Auth.js + Google provider  [next-auth.js](https://next-auth.js.org/providers/google) | Google sign-in for staff and customers, with role-based access to admin and POS surfaces. [next-auth.js](https://next-auth.js.org/providers/google) |

## Data model

Use one canonical `user` model for both staff and customers, then connect provider accounts, sessions, orders, and addresses to that single identity record. Keep `product_variants` as the sellable unit, because apparel stock lives at the size-and-color level rather than the parent product level. [supabase](https://supabase.com/features/postgres-database)

| Table | Purpose | Key fields |
|---|---|---|
| `users`  [next-auth.js](https://next-auth.js.org/providers/google) | Canonical identity for staff and customers. [next-auth.js](https://next-auth.js.org/providers/google) | `id`, `email`, `name`, `role`, `image`, `created_at`. [next-auth.js](https://next-auth.js.org/providers/google) |
| `accounts`  [next-auth.js](https://next-auth.js.org/providers/google) | OAuth provider links. [next-auth.js](https://next-auth.js.org/providers/google) | `user_id`, `provider`, `provider_account_id`, `access_token`. [next-auth.js](https://next-auth.js.org/providers/google) |
| `sessions`  [next-auth.js](https://next-auth.js.org/providers/google) | Login session state. [next-auth.js](https://next-auth.js.org/providers/google) | `user_id`, `token`, `expires_at`. [next-auth.js](https://next-auth.js.org/providers/google) |
| `products`  [supabase](https://supabase.com/docs) | Parent catalog item. [supabase](https://supabase.com/docs) | `id`, `slug`, `name`, `description`, `category`, `status`. [supabase](https://supabase.com/docs) |
| `product_variants`  [supabase](https://supabase.com/docs) | Sellable apparel SKU by size and color. [supabase](https://supabase.com/docs) | `product_id`, `sku`, `size`, `color`, `barcode`, `price`. [supabase](https://supabase.com/docs) |
| `inventory_locations`  [supabase](https://supabase.com/docs) | Stock buckets such as warehouse, store, returns, and damaged. [supabase](https://supabase.com/docs) | `id`, `name`, `type`. [supabase](https://supabase.com/docs) |
| `inventory_movements`  [supabase](https://supabase.com/docs) | Immutable stock ledger for receive, reserve, sale, return, and adjustment events. [supabase](https://supabase.com/docs) | `variant_id`, `location_id`, `qty_delta`, `reason`, `reference_type`, `reference_id`. [supabase](https://supabase.com/docs) |
| `stock_reservations`  [supabase](https://supabase.com/docs) | Temporary holds during cart and checkout flow. [supabase](https://supabase.com/docs) | `variant_id`, `order_id`, `qty`, `expires_at`, `status`. [supabase](https://supabase.com/docs) |
| `orders`  [supabase](https://supabase.com/docs) | OMS header for web and POS sales. [supabase](https://supabase.com/docs) | `id`, `customer_id`, `channel`, `status`, `currency`, `subtotal`, `shipping_fee`, `total`. [supabase](https://supabase.com/docs) |
| `order_items`  [supabase](https://supabase.com/docs) | Immutable purchase snapshot of each variant sold. [supabase](https://supabase.com/docs) | `order_id`, `variant_id`, `sku_snapshot`, `size_snapshot`, `color_snapshot`, `unit_price`, `qty`. [supabase](https://supabase.com/docs) |
| `payments`  [docs.lemonsqueezy](https://docs.lemonsqueezy.com/guides/developer-guide/getting-started) | Payment state and external references from Lemon Squeezy. [docs.lemonsqueezy](https://docs.lemonsqueezy.com/guides/developer-guide/getting-started) | `order_id`, `provider`, `checkout_id`, `external_order_id`, `status`, `paid_at`. [docs.lemonsqueezy](https://docs.lemonsqueezy.com/guides/developer-guide/getting-started) |
| `shipments`  [aftership](https://www.aftership.com/carriers/jtexpress-ph/api) | Shipping state for J&T via AfterShip. [aftership](https://www.aftership.com/carriers/jtexpress-ph/api) | `order_id`, `carrier_slug`, `tracking_number`, `aftership_tracking_id`, `label_url`, `status`. [aftership](https://www.aftership.com/carriers/jtexpress-ph/api) |
| `webhook_events`  [docs.lemonsqueezy](https://docs.lemonsqueezy.com/api/webhooks/create-webhook) | Idempotent webhook log for payments and tracking updates. [docs.lemonsqueezy](https://docs.lemonsqueezy.com/api/webhooks/create-webhook) | `provider`, `event_id`, `event_type`, `payload`, `processed_at`, `status`. [docs.lemonsqueezy](https://docs.lemonsqueezy.com/api/webhooks/create-webhook) |

## OMS flow

Run both storefront checkout and POS sales through the same order service so every sale touches the same inventory and order state machine. Use signed Lemon Squeezy webhooks as the payment truth source and AfterShip as the shipment truth source for tracking updates. [aftership](https://www.aftership.com/carriers/jtexpress-ph/api)

1. Publish a product, then create size-and-color variants with unique SKU and barcode values, and load opening stock into inventory locations. [supabase](https://supabase.com/docs)
2. When a shopper adds to cart or a cashier scans a barcode, create or update a stock reservation for the selected variant before payment finalization. [supabase](https://supabase.com/docs)
3. Create an order in `PENDING_PAYMENT`, attach line-item snapshots, and send the buyer to hosted checkout or a POS payment link through Lemon Squeezy. [docs.lemonsqueezy](https://docs.lemonsqueezy.com/api/webhooks/create-webhook)
4. After a verified payment webhook arrives, mark the order `PAID`, convert reservations into committed inventory movements, and write the provider references into `payments`. [npmjs](https://www.npmjs.com/package/@lemonsqueezy/lemonsqueezy.js?activeTab=readme)
5. When fulfillment starts, create a shipment record, store the AfterShip and J&T tracking references, and update the tracking page from shipment status events. [github](https://github.com/AfterShip/tracking-sdk-nodejs)

## SOP

Keep SOPs short and operational so staff can follow the same flow in web, warehouse, and POS contexts.

- Catalog SOP: Create the parent product first, add all size/color variants next, assign SKU and barcode per variant, then load opening stock by location before publishing. [supabase](https://supabase.com/features/postgres-database)
- Web order SOP: Reserve stock at checkout start, create the pending order, wait for a signed Lemon Squeezy payment webhook, then mark paid and release fulfillment only after webhook confirmation. [docs.lemonsqueezy](https://docs.lemonsqueezy.com/help/lemonjs)
- POS SOP: Scan barcode, confirm size/color and quantity, create a `POS` order, collect payment through the same payment service or approved in-store flow, and deduct stock through the same inventory service used by web orders. [docs.lemonsqueezy](https://docs.lemonsqueezy.com/api/webhooks/create-webhook)
- Fulfillment SOP: Pack by variant SKU, create the J&T shipment through AfterShip-connected workflow, save the tracking number, mark shipped, and reconcile failed labels or exceptions from the orders queue daily. [aftership](https://www.aftership.com/carriers/jtexpress-ph)

## Sprint plan

Run the sprint in small PR-sized slices inside your usual feature-branch to `development` to `main` flow so deployment stays clean and testable in the monorepo.

| Day | Deliverable |
|---|---|
| Day 1 | Repo bootstrap, pnpm workspace, Turbo pipelines, env setup, Supabase schema, seed data, Google auth base. [turborepo](https://turborepo.dev) |
| Day 2 | Product catalog APIs, variant management, inventory locations, movement ledger, barcode model, admin inventory UI. [supabase](https://supabase.com/docs) |
| Day 3 | Storefront home, shop grid, PDP, cart, stock reservation flow, checkout handoff to Lemon Squeezy. [nextjs](https://nextjs.org/docs/app) |
| Day 4 | Payment webhook ingestion, order state machine, POS terminal, barcode lookup, shared order service for web and POS. [docs.lemonsqueezy](https://docs.lemonsqueezy.com/api/webhooks/create-webhook) |
| Day 5 | Orders hub, shipment records, AfterShip tracking integration, customer tracking page, low-stock alerts. [aftership](https://www.aftership.com/carriers/jtexpress-ph/api) |
| Day 6 | QA, webhook replay tests, role checks, staging deploy, branch merge to `development`. [docs.lemonsqueezy](https://docs.lemonsqueezy.com/api/webhooks/create-webhook) |
| Day 7 | UAT, production deploy, branch merge to `main`, SOP handoff, and launch checklist. |