# Agent Instructions – Apparel Commerce Platform

You are working on the **Apparel Commerce Platform**, a composable commerce system for apparel sales across storefront, POS, and fulfillment. Use this file as your primary context when assisting with this codebase.

## Project Overview

- **Purpose**: Unified online and in-store sales for a shorts/apparel retail business in the Philippines.
- **Architecture**: Monorepo (Turborepo + pnpm) with one shared source of truth for products, variants, inventory, orders, payments, and shipments.
- **Apps**: `apps/storefront`, `apps/admin`, `apps/api`, `apps/medusa`.
- **Packages**: `types`, `validation`, `rate-limits`, `database`, `config`, `sdk`.

## Canonical Documentation

Read these first when answering questions about scope, flow, or requirements:

- **internal/docs/spec.md** – System scope, tech stack, functional requirements, OMS flow.
- **internal/docs/blueprint.md** – Sprint plan, data model, OMS flow, SOPs.
- **internal/docs/privacy-terms.md** – PRD, service agreement, GDPR/PDPA compliance.

For doc context commands, use **internal/docs** and **.cursor/llm** as canonical roots (see `.cursor/commands/docs.md`).

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js App Router, Tailwind CSS, shadcn/ui |
| API | Node.js + Express |
| Database | PostgreSQL via Supabase |
| Auth | NextAuth/Auth.js with Google provider |
| Payments | Lemon Squeezy, Stripe, PayPal, Paymongo (GCash), Maya |
| Shipping | AfterShip + J&T Express Philippines |

## Critical Rules

1. **Payment truth**: Orders MUST NOT be marked as paid from client-side redirect alone. Use verified Lemon Squeezy webhooks.
2. **Webhook verification**: Always verify webhook signatures before mutating order, payment, or inventory state.
3. **Inventory**: Use immutable inventory movements. No manual stock overwrites as the only source of truth.
4. **Secrets**: Store OAuth, payment, and API keys in environment variables. Never expose them in client bundles.
5. **Shared logic**: Put types, validation, and service adapters in `packages/*`; consume from apps.

## Code Standards

- Follow `.cursor/rules/rules.mdc` for clean code, naming, and structure.
- Use `function` over arrow functions for top-level functions.
- Prefer explicit return types for top-level functions.
- Avoid emoji in UI and codebase.
- Use professional layout, typography, and spacing in UI.

## Commands and Workflows

- **/audit** – Full system audit (storefront, admin, API, webhooks, payments).
- **/QA** – Comprehensive QA report (architecture, data, auth, order flow, SDKs).
- **/trace** – Map data flow from UI → API → Supabase; flag MOCK/TODO/STUB.
- **/hardening** – Production hardening with findings log and fix phase.
- **/docs** – Load context from `internal/docs` and `.cursor/llm` only.

## Project Structure Reference

```
apps/
├── storefront   # Home, shop, PDP, cart, checkout, track, account
├── admin        # Dashboard, inventory, orders, POS
├── api          # Health, compliance (internal key)
└── medusa       # Commerce backend (Medusa 2)
packages/
├── types, validation, rate-limits, database, config, sdk
```

## MCP (Model Context Protocol)

- **Stripe** – Payments, subscriptions, refunds, docs search. Use for Stripe/Lemon Squeezy card flows.
- **PayPal** – Orders, refunds, disputes, subscriptions. Use for PayPal/Lemon Squeezy flows.
- **Supabase** – Database, migrations, Edge Functions. See `mcp_supabase_*` tools.

Ensure Stripe and PayPal MCP servers are enabled in Cursor when working on payment integrations.

## Skills (when relevant)

- **storefront-best-practices** – E-commerce storefronts, checkout, cart, product pages.
- **building-admin-dashboard-customizations** – Admin UI, widgets, forms, tables.
- **authentication-setup** – Login, JWT, OAuth, session, RBAC.
- **design-with-taste** – Simplicity, fluidity, delight in UI.
- **stripe-integration** (skills-lock) – Stripe setup, webhooks, Lemon Squeezy integration.
- **paypal-integration** (skills-lock) – PayPal setup, webhooks, Lemon Squeezy integration.
