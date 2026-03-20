---
title: Apparel Commerce Platform
description: A composable commerce system for apparel sales across storefront, POS, and fulfillment.
author: PC Gaming18
website-to: https://your-domain.com
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

### 12. SOP Requirements

The implementation SHALL support the following operational procedures.

#### 12.1 Catalog SOP

- Create a parent product
- Add all size and color variants
- Assign SKU and barcode per variant
- Upload product images
- Load stock into a location
- Publish the product

#### 12.2 Web Order SOP

- Reserve stock at checkout start
- Create pending payment order
- Wait for verified payment webhook
- Convert reservation to sale
- Queue for fulfillment

#### 12.3 POS SOP

- Scan barcode or search SKU
- Confirm selected variant and quantity
- Create POS order
- Collect payment through approved flow
- Commit inventory movement
- Print or issue receipt reference if configured

#### 12.4 Fulfillment SOP

- Pick item by variant SKU
- Pack by order reference
- Create shipment
- Save tracking number
- Mark order as shipped
- Monitor exceptions and failed deliveries

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

## Rationale

This design uses a composable architecture because the business requires both public commerce flows and internal retail operations while keeping one inventory and order truth layer. Apparel commerce also depends on variant-level stock management, which makes a normalized relational model more reliable than flat product stock tracking. A separate API server is included so webhook verification, background jobs, and logistics synchronization can run independently from page rendering and user interaction layers.

## Security Considerations

Payment and shipping webhooks MUST be verified before mutating order, shipment, or inventory state. All privileged admin and POS routes MUST require authenticated staff roles, and customer routes MUST be isolated from internal operations. Sensitive credentials including OAuth secrets, payment secrets, API keys, and database connection strings MUST be stored in environment variables and never exposed in client bundles. Inventory changes SHOULD be auditable through immutable movement records and attributable to a user or system process whenever possible.

## Copyright

Copyright and related rights waived via Copyright (c) 2026 @JustineDevs - All Rights Reserved
Unauthorized copying of this file, via any medium is strictly prohibited. Proprietary and confidential.