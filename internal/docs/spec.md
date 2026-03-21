---
title: Apparel Commerce Platform
description: A composable commerce system for apparel sales across storefront, POS, and fulfillment.
author: @Justinedevs
website-to: https://maharlika-apparel-custom.vercel.app
status: Draft
type: Informational
created: 2026-03-20
requires tech stack:
 - Next.js App Router
 - Node.js + Express
 - PostgreSQL via Supabase
 - Turborepo + pnpm
 - Tailwind CSS + shadcn/ui
 - NextAuth/Auth.js
 - Lemon Squeezy
 - AfterShip
---

## Abstract

This specification defines a composable apparel commerce platform for a shorts and clothing business operating through a customer storefront, internal admin dashboard, point-of-sale terminal, and centralized order management system. The platform uses a shared monorepo and a single transactional database so that product variants, inventory, orders, payments, and shipment tracking remain consistent across both online and in-store sales. It also defines the operational flow for hosted payments, Google-based authentication, J&T Express Philippines tracking through AfterShip, and the minimum implementation boundaries required for sprint delivery.

## Specification

### 1. System Scope

The platform SHALL provide two application environments:

1. A public customer storefront for product discovery, checkout, tracking, and account access.
2. An internal operations environment for admin analytics, inventory control, POS transactions, and order fulfillment.

The platform SHALL maintain one shared source of truth for products, product variants, inventory, orders, payments, and shipments.

### 2. Technology Stack

The implementation SHALL use the following stack:

- Frontend applications: Next.js App Router
- API server: Node.js with Express
- Database: PostgreSQL via Supabase
- Monorepo orchestration: Turborepo with pnpm workspaces
- UI layer: Tailwind CSS with shadcn/ui
- Authentication: NextAuth/Auth.js with Google provider
- Payments: Lemon Squeezy
- Shipment tracking: AfterShip with J&T Express Philippines integration

Shared types, validation logic, UI primitives, and database-facing modules SHOULD be placed in reusable monorepo packages and consumed by all apps.

### 3. Monorepo Structure

The repository SHALL be organized into application and package boundaries.

#### 3.1 Applications

- `apps/storefront` for the public commerce frontend
- `apps/admin` for dashboard, POS, and fulfillment interfaces
- `apps/api` for webhooks, background jobs, inventory services, and order services

#### 3.2 Shared Packages

- `packages/ui` for shared components
- `packages/types` for shared domain types
- `packages/validation` for request and payload validation
- `packages/database` for migrations, schema utilities, and seed files
- `packages/config` for TypeScript, linting, and styling configuration
- `packages/sdk` for internal clients and service adapters

### 4. Functional Pages

The storefront SHALL include the following pages:

- `/` Home page
- `/shop` Product listing page
- `/shop/[slug]` Product detail page
- `/checkout` Checkout page
- `/track/[orderId]` Order tracking page
- `/account` Customer account page

The internal application SHALL include the following pages:

- `/admin` Dashboard
- `/admin/inventory` Inventory management
- `/admin/orders` Order fulfillment hub
- `/admin/orders/[orderId]` Order detail: line items, staff shipment registration, mark shipped / delivered
- `/admin/pos` POS terminal

### 5. Catalog and Variant Model

The catalog SHALL support parent products and sellable product variants.

#### 5.1 Products

A product represents the parent apparel item and SHALL contain:

- Name
- Slug
- Description
- Category
- Brand
- Status
- Product images

#### 5.2 Product Variants

A variant represents the sellable stock-keeping unit and SHALL contain:

- Product reference
- SKU
- Barcode
- Size
- Color
- Selling price
- Optional compare-at price
- Optional cost
- Active status

A unique combination of `product_id`, `size`, and `color` MUST identify one variant only.

### 6. Inventory Model

Inventory SHALL be controlled at the product variant level.

#### 6.1 Inventory Locations

The system SHALL support named stock locations such as:

- Warehouse
- Retail store
- Returns
- Damaged stock

#### 6.2 Inventory Movements

All stock changes MUST be recorded as immutable inventory movements. Supported movement reasons SHOULD include:

- Opening stock
- Purchase
- Reservation
- Reservation release
- Sale
- Return
- Adjustment
- Damage
- Transfer in
- Transfer out

The platform MUST NOT rely on manual stock overwrites as the only source of truth.

#### 6.3 Stock Reservations

The system SHALL support temporary reservation of variant stock during checkout and POS payment initiation. Reservations MUST expire if payment is not completed within the configured timeout window.

### 7. User and Role Model

The platform SHALL use one canonical user model for both customers and staff.

Supported roles SHALL include:

- `admin`
- `staff`
- `customer`

Google OAuth SHALL be supported through NextAuth/Auth.js. Session and provider-link records SHALL be associated with the canonical user entity.

### 8. Order Management System

The order management system SHALL support both web and POS orders.

#### 8.1 Order Header

An order SHALL contain:

- Order number
- Customer reference
- Billing address
- Shipping address
- Sales channel
- Status
- Currency
- Monetary totals
- Notes
- Creation metadata

#### 8.2 Order Items

Each order item SHALL snapshot the following values at purchase time:

- Variant reference
- SKU
- Product name
- Size
- Color
- Unit price
- Quantity
- Line total

Catalog updates after purchase MUST NOT mutate historical order-item values.

#### 8.3 Order Channels

Supported channels SHALL include:

- `web`
- `pos`

#### 8.4 Order Statuses

Supported statuses SHALL include:

- `draft`
- `pending_payment`
- `paid`
- `ready_to_ship`
- `shipped`
- `delivered`
- `cancelled`
- `refunded`

### 9. Payment Flow

Payments SHALL be processed through Lemon Squeezy.

The system SHALL support:

- Hosted checkout for storefront orders
- Payment-link generation for POS orders when needed
- Webhook-based payment confirmation
- Payment records linked to internal orders

The API server MUST verify incoming payment webhooks before changing order or inventory state.

An order MUST NOT be marked as paid solely from client-side redirect state.

### 10. Shipment Flow

Shipment tracking SHALL be integrated through AfterShip using J&T Express Philippines as the carrier context.

Each shipment SHALL support:

- Internal order reference
- Carrier slug
- Tracking number
- External tracking identifier
- Label URL when available
- Shipment status
- Checkpoint text
- Shipment timestamps

The customer tracking page SHALL render shipment progress based on stored shipment state synchronized from provider events or polling jobs.

Anonymous tracking SHALL use a **scoped secret** (e.g. HMAC of order id) conveyed in the URL query string so that knowledge of the order UUID alone is insufficient to read order or shipment data.

After checkout begins, the platform SHOULD email the buyer (when an email address is collected and transactional email is configured) a message containing the **same signed tracking URL** shown on the checkout step before hosted payment.

### 11. OMS Processing Flow

The standard order flow SHALL be:

1. Customer or cashier selects a product variant.
2. The system validates variant availability.
3. The system creates or updates a stock reservation.
4. The system creates an order in `pending_payment`.
5. The system initiates Lemon Squeezy checkout or payment link generation.
6. The API server verifies the payment webhook.
7. The order status changes to `paid`.
8. Reservation quantity is converted into committed sale movement.
9. Fulfillment staff prepares the package.
10. A shipment record is created and tracking is attached.
11. The order transitions through fulfillment and delivery statuses.

All inventory mutations for web and POS orders MUST pass through the same inventory service boundary.

### 12. SOP Requirements (Medusa implementation)

**Canonical runbook:** Day-to-day operations when **Medusa** is the live system of record are defined in **`internal/docs/SOP-OPERATIONS-MEDUSA.md`**. That document is normative for **SOP-0** (preconditions) through **SOP-9** (definition of done), including catalog, stock, web orders, POS, fulfillment, health checks, access, and incidents.

The implementation SHALL satisfy the following when production is configured with **`NEXT_PUBLIC_COMMERCE_SOURCE=medusa`**, **`LEGACY_COMMERCE_API_DISABLED=true`** (after cutover), and webhooks (Lemon, AfterShip) targeting **Medusa** only:

1. **Catalog:** New products and variants are created **only** in **Medusa Admin** (handles, options, SKUs, images, inventory at **Warehouse PH**, sales channel **Web PH**); no parallel live catalog in legacy Postgres for production SKUs.
2. **Stock:** Adjustments use **Medusa** inventory flows with audit trail; not raw SQL against production.
3. **Web orders:** Checkout and payment confirmation run through **Medusa** + Lemon as configured; support looks up orders in **Medusa Admin**; tracking UX reads **Medusa** fulfillment data in production.
4. **POS:** In-store sales use **Medusa** draft-order / POS or **Medusa APIs only**; not legacy Express `POST /orders` in production.
5. **Fulfillment:** Pick/pack/ship and tracking align **Medusa** fulfillments with carrier and **AfterShip** as integrated; customer track page does not depend on legacy Express in production.
6. **Health:** Daily checks cover Medusa, storefront, webhook error rates, and stuck orders per **SOP-6** in the runbook.

**Definition of done (operational):** As in **SOP-9** of `SOP-OPERATIONS-MEDUSA.md`: every live SKU and order path runs through **Medusa**; staff can execute standard catalog through fulfillment steps without developer assistance.

**Legacy stack note:** Until cutover, the Express + Supabase flows in §11 and elsewhere may still apply; after cutover, **§12** and `SOP-OPERATIONS-MEDUSA.md` supersede routine legacy OMS procedures for production.

### 13. API Responsibilities

The API server SHALL own the following responsibilities:

- Payment webhook ingestion
- Shipment webhook ingestion
- Inventory mutation services
- Order state transitions
- Barcode lookup logic
- Background syncs and retryable jobs
- Low-stock detection
- Webhook idempotency logging

Webhook processing MUST be idempotent and persist provider event metadata for replay safety.

### 14. Non-Functional Requirements

The platform SHOULD satisfy the following operational goals:

- Shared types across all applications
- Consistent UI primitives across storefront and internal tools
- Clear service boundaries between UI, business logic, and database access
- Production-ready TypeScript code
- Migration-based database evolution
- Copy-pasteable environment configuration
- Deployment compatibility with branch-based staging and production workflows

### 15. Stakeholder business requirements (Maharlika Apparel Custom intake)

The following rows are taken from the submitted **Apparel Business Requirement Form** (`internal/docs/exclusive/Apparel Business Requirement Form.csv`). The on-disk artifact is a **ZIP** wrapping the CSV export; see `ARCHITECTURE-DELIVERABLE.md` §1 for how to open it.

| Topic | Stated requirement |
|--------|---------------------|
| Business | Maharlika Apparel Custom |
| Contact | Maharlikaapparelcustom@gmail.com |
| Current sales channels | Facebook / Instagram |
| Target launch date | 2026-04-10 |
| Scale | 500+ SKU positions / items in stock (stated as “500+”) |
| Product attributes | Category (shorts/shirt/jacket/etc.); size; color; **material**; **condition (new / old stock)** |
| Variant / tracking dimensions | Size variants; color variants; **style variants**; **bundle packs** |
| Additional services | **Custom printing**; **bulk orders**; **uniform orders** |
| Admin / POS users | Owner; sales clerk; accountant |
| Minimum reorder level | **1000** per SKU (stated in form) |
| Customer Google login | **Yes**: faster checkout |
| Pre-orders when out of stock | **Yes** |
| Payment methods (desired) | PayPal; GCash/Maya with **manual receipt upload**; **COD**; **bank transfer** |
| Promo codes / vouchers | **Yes** |
| Size guide on PDP | **Yes** |
| Return / exchange | Flexibility level **3** (scale in form); details in `internal/docs/Exchange Policy Details.md` |
| J&T pickup address | B16 L45 ACM Paramount Homes, Brgy. Navarro, General Trias, Cavite |
| J&T rate calculation at checkout | **Yes**: by weight / dimensions |
| Tracking notifications | **Yes**: automated SMS **and** email |
| Average parcel weight | **5 kg** (per form; validate with ops: may be ~0.5 kg in practice) |
| Typical parcel dimensions | 10 × 10 × 10 (units assumed cm) |
| Shipping zones | **Separate rules** for Metro Manila, provincial, **international** |
| Business permits (payments) | **Processing** (DTI/SEC + BIR 2303 path in progress) |
| Domain | Not owned yet (“N/A” in form) |
| FB Shop / TikTok Shop | **No** for launch |
| Commercial rules (notes) | Example: **free shipping** when order quantity crosses thresholds (e.g. 10–20+ pieces) |

#### 15.1 As-built vs intake (explicit gaps)

This repository’s **as-built** slice (Express + Supabase + Lemon Squeezy + AfterShip) **does not yet implement** every cell above. Track these deltas in backlog, not as optional “nice-to-haves” when the business has already answered **Yes**:

- **Payments:** Production path is **Lemon Squeezy** (hosted checkout + webhook truth). PayPal, GCash/Maya manual proof, COD, and bank transfer require separate flows, risk controls, and reconciliation: not interchangeable with LS webhook semantics.
- **Catalog:** **Material**, **condition**, **style**, and **bundle** constructs may need schema and admin UX beyond current `products` / `product_variants`.
- **Pre-orders:** Requires sellable state when `available_qty = 0`, distinct reservations, and fulfillment SLAs.
- **Shipping:** Automatic J&T rating by weight/dimensions + **zone tables** (Metro / provincial / international) and “free shipping at N pieces” need quote service + rules engine + tests.
- **Notifications:** **Resend** (optional) sends **checkout-started** email with signed tracking link when `RESEND_*` is configured; **SMS** and full order-lifecycle alerts are not wired.
- **Reorder / low stock:** Intake states **1000** minimum per SKU; wire to low-stock jobs and admin surfacing (see §13).
- **Customer Google OAuth:** NextAuth exists; **account linking** and **order history by user** remain productized per §7–8.

### 16. Medusa migration (program)

The repository includes a **parallel Medusa 2.x backend** (`apparel-commerce/apps/medusa`) as the **declared future system of record** for commerce domains. The authoritative program table and ADR live in **`internal/docs/MEDUSA-MIGRATION-PROGRAM.md`** and **`internal/docs/adr/0001-medusa-system-of-record.md`**. **Operational scripts:** `seed:ph` (Philippines region, **Web PH** sales channel, default stock location + legacy location code metadata), `import:legacy-catalog`, and `import:legacy-inventory` (see `apps/medusa/README.md`, `internal/docs/migration/field-mapping.md`). Until cutover (Phase 8), the specification’s functional SHALL statements continue to be satisfied by the **legacy Express + Supabase** stack unless explicitly dual-documented.

After cutover, **production operations** follow **`internal/docs/SOP-OPERATIONS-MEDUSA.md`** in conjunction with **§12** above.

## Rationale

This design uses a composable architecture because the business requires both public commerce flows and internal retail operations while keeping one inventory and order truth layer. Apparel commerce also depends on variant-level stock management, which makes a normalized relational model more reliable than flat product stock tracking. A separate API server is included so webhook verification, background jobs, and logistics synchronization can run independently from page rendering and user interaction layers.

## Security Considerations

Payment and shipping webhooks MUST be verified before mutating order, shipment, or inventory state. All privileged admin and POS routes MUST require authenticated staff roles, and customer routes MUST be isolated from internal operations. Sensitive credentials including OAuth secrets, payment secrets, API keys, and database connection strings MUST be stored in environment variables and never exposed in client bundles. Inventory changes SHOULD be auditable through immutable movement records and attributable to a user or system process whenever possible.

## Copyright

Copyright and related rights waived via Copyright (c) 2026 @JustineDevs - All Rights Reserved
Unauthorized copying of this file, via any medium is strictly prohibited. Proprietary and confidential.