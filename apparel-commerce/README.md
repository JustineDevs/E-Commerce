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

## Deployment (temporary)

- **Storefront (Vercel preview):** [https://maharlika-apparel-custom.vercel.app](https://maharlika-apparel-custom.vercel.app)
- Set `NEXT_PUBLIC_SITE_URL`, `NEXTAUTH_URL`, and `PUBLIC_STOREFRONT_URL` to that origin on Vercel. Point Google OAuth redirect URIs to `{origin}/api/auth/callback/google`.
- **Medusa:** add the same origin to `STORE_CORS` / `AUTH_CORS` / `ADMIN_CORS` and `STOREFRONT_PUBLIC_URL` in `apps/medusa` env.

## Environment

Two files, one owner each:

| File | Owns |
|------|------|
| **`.env`** at repo root (from `.env.example`) | NextAuth, Google OAuth, UI / `NEXT_PUBLIC_*`, Express API URLs & secrets, **`LEGACY_DATABASE_URL`** + Supabase keys for the legacy schema, Medusa **client** settings (`MEDUSA_*` / `NEXT_PUBLIC_MEDUSA_*`) |
| **`apps/medusa/.env`** (from `.env.template`) | **`DATABASE_URL`** (commerce Postgres), `REDIS_URL`, `JWT_SECRET`, `COOKIE_SECRET`, Medusa CORS, Lemon/AfterShip/Resend, payment providers |

Do not use **`DATABASE_URL`** at the root for a different database than Medusa’s — that name is reserved for the Medusa process. Lemon, AfterShip, and Resend are configured **only** in `apps/medusa/.env.template` (not duplicated in root `.env.example`). Legacy Express routes may still read those variable names from the API process environment when enabled—inject via your host, not a second template.

## Getting Started

1. Env: copy **`.env.example`** → **`.env`** at repo root; copy **`apps/medusa/.env.template`** → **`apps/medusa/.env`** (commerce secrets live only in the Medusa file).
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
