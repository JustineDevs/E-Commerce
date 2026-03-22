<div align="center">
  <div style="background-color: white; padding: 24px; border-radius: 8px; display: inline-block;">
    <img src="public/Maharlika%20Logo%20Design.png" alt="MAHARLIKA GRAND CUSTOMS" width="800" />
  </div>
</div>

# Apparel Commerce Platform

A composable commerce system for apparel sales across storefront, POS, and fulfillment. Built for a shorts and clothing business operating through a customer storefront, internal admin dashboard, point-of-sale terminal, and centralized order management system.

## Overview

The platform uses a shared monorepo and a single transactional database so that product variants, inventory, orders, payments, and shipment tracking remain consistent across both online and in-store sales.

### Key Features

- **Storefront**: Product discovery, cart, checkout, order tracking, and customer account
- **Admin Dashboard**: Analytics, inventory management, order fulfillment hub, POS terminal
- **Unified OMS**: One source of truth for products, variants, inventory, orders, payments, and shipments
- **Payments**: Lemon Squeezy hosted checkout and payment links (webhook-verified)
- **Shipping**: AfterShip integration with J&T Express Philippines for tracking

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js App Router, Tailwind CSS, shadcn/ui |
| API | Node.js + Express |
| Database | PostgreSQL via Supabase |
| Monorepo | Turborepo + pnpm workspaces |
| Auth | NextAuth/Auth.js with Google provider |
| Payments | Lemon Squeezy |
| Shipping | AfterShip + J&T Express Philippines |

## Live preview

**Storefront (Vercel):** https://maharlika-apparel-custom.vercel.app — see [VERCEL.md](VERCEL.md)  
**Medusa backend (Fly.io):** See [FLY.md](FLY.md) for deploy instructions.

Configure `NEXT_PUBLIC_SITE_URL` and related env vars to this origin when deploying.

## Project Structure

```
apps/
├── storefront/   # Public customer storefront
├── admin/        # Dashboard, POS, fulfillment
├── api/          # Health, compliance (internal API key)
└── medusa/       # Medusa 2 commerce backend
packages/
├── types/        # Domain types (Product, variants)
├── validation/   # Zod schemas (shop query, order status, roles)
├── rate-limits/  # Env-driven rate-limit presets (Express API)
├── database/     # Supabase legacy, compliance, OAuth upsert
├── config/       # TypeScript, ESLint, Tailwind
└── sdk/          # Medusa env helpers, shared constants
internal/docs/     # Spec, blueprint, privacy-terms
```

## Getting Started

### Prerequisites

- Node.js >= 20
- pnpm 9.x
- Supabase project
- Lemon Squeezy and AfterShip API credentials
- Google OAuth client (for NextAuth)

### Local development ports

| Port | Service |
|------|---------|
| 3000 | Storefront |
| 3001 | Admin dashboard |
| 4000 | Express API (health, compliance) |
| 9000 | Medusa commerce backend |

- **Storefront** (3000): http://localhost:3000 — shop, cart, checkout, sign-in
- **Admin** (3001): http://localhost:3001/admin — dashboard, orders, POS
- **Medusa** (9000): http://localhost:9000/health — commerce API

### Install

```bash
pnpm install
```

### Environment

Copy `.env.example` to `.env` and configure:

- `DATABASE_URL` – Supabase Postgres connection string
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL` – NextAuth configuration
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` – Google OAuth
- See `apps/medusa/.env.template` for Lemon Squeezy, Stripe, PayPal, Paymongo, Maya credentials
- AfterShip API key

### Database

```bash
pnpm db:migrate
pnpm db:seed
```

### Development

```bash
pnpm dev
```

Runs storefront, admin, and API in development mode.

### Build

```bash
pnpm build
```

## Documentation

- [Payment Integration](internal/docs/runbooks/PAYMENT-INTEGRATION.md) – Lemon Squeezy, Stripe, PayPal, Paymongo (GCash), Maya setup
- [Specification](internal/docs/spec.md) – System scope, tech stack, functional requirements
- [Blueprint](internal/docs/blueprint.md) – Sprint plan, data model, OMS flow
- [Privacy & Terms](internal/docs/privacy-terms.md) – PRD, service agreement, GDPR/PDPA

## Security

See [SECURITY.md](SECURITY.md) for reporting vulnerabilities and security practices.

## License

Copyright (c) 2026 @JustineDevs. All rights reserved. Proprietary and confidential.
