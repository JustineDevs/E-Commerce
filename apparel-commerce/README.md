# Apparel Commerce Platform

A composable commerce system for apparel sales across storefront, POS, and fulfillment.

## Structure

```
apparel-commerce/
├── apps/
│   ├── storefront/   # Public customer storefront
│   ├── admin/        # Internal dashboard, POS, fulfillment
│   └── api/          # Webhooks, background jobs, services
├── packages/
│   ├── ui/           # Shared components
│   ├── types/        # Shared domain types
│   ├── database/     # Migrations, schema, seed
│   ├── config/       # TypeScript, ESLint, Tailwind configs
│   ├── validation/   # Request and payload validation
│   └── sdk/          # Internal clients and service adapters
```

## Tech Stack

- **Frontend:** Next.js App Router, Tailwind CSS, shadcn/ui
- **API:** Node.js + Express
- **Database:** PostgreSQL via Supabase
- **Auth:** NextAuth/Auth.js (Google OAuth)
- **Payments:** Lemon Squeezy
- **Tracking:** AfterShip (J&T Express Philippines)

## Getting Started

1. Copy `.env.example` to `.env` and fill in your credentials.
2. Install dependencies: `pnpm install`
3. Run database migrations: `pnpm db:migrate`
4. Seed database (optional): `pnpm db:seed`
5. Start development: `pnpm dev`

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in development mode |
| `pnpm build` | Build all apps and packages |
| `pnpm lint` | Lint all packages |
| `pnpm db:migrate` | Run database migrations |
| `pnpm db:seed` | Seed the database |
