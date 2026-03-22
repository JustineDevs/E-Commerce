# Fly.io Deployment (Medusa Backend)

Use these steps to deploy the Medusa backend to Fly.io.

---

## Recommended specifications (MVP)

| Setting | Value | Notes |
|---------|-------|-------|
| **Internal port** | `9000` | Medusa default. **Do not use 8080.** |
| **VM memory** | `512mb` | Sufficient for MVP. Upgrade to 1gb for production traffic. |
| **CPU** | `shared` / 1 CPU | Avoid `performance-16x` — overkill and costly. |
| **Region** | `ams` or nearest | Amsterdam (`ams`) or `nrt` (Tokyo) for Asia traffic. |
| **min_machines_running** | `0` | Scale to zero when idle (saves cost). |

---

## Prerequisites

- [Fly CLI](https://fly.io/docs/hands-on/install-flyctl/) installed
- Fly.io account ([sign up](https://fly.io/app/sign-up))
- Postgres database (Fly Postgres or Supabase)

---

## Deploy from repo root

```bash
# From repo root
fly launch --config fly.toml --no-deploy
```

Set secrets before first deploy:

```bash
fly secrets set DATABASE_URL="postgres://..." JWT_SECRET="..." COOKIE_SECRET="..." NODE_ENV=production
fly secrets set STORE_CORS="https://maharlika-apparel-custom.vercel.app" ADMIN_CORS="https://maharlika-apparel-custom.vercel.app" AUTH_CORS="https://maharlika-apparel-custom.vercel.app"
```

Add payment provider secrets (e.g. Lemon Squeezy):

```bash
fly secrets set LEMONSQUEEZY_API_KEY="..." LEMONSQUEEZY_WEBHOOK_SECRET="..."
```

Deploy:

```bash
fly deploy
```

---

## GitHub deploy (from dashboard)

If using Fly’s “Launch from GitHub”:

1. **App name:** `maharlika-apparel-custom` (or your choice)
2. ** region:** `ams` (Amsterdam) or nearest to users
3. **Internal port:** `9000` — Medusa listens on 9000, **not 8080**
4. **Machine size:** `shared-cpu-1x` with `512mb` — not performance-16x / 32GB
5. **Root directory:** leave empty (monorepo builds from root via Dockerfile.medusa)

---

## Environment variables (Fly secrets)

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | ✅ | Postgres connection string (Fly Postgres or Supabase) |
| `JWT_SECRET` | ✅ prod | Not `supersecret` in production |
| `COOKIE_SECRET` | ✅ prod | Not `supersecret` in production |
| `STORE_CORS` | ✅ prod | e.g. `https://maharlika-apparel-custom.vercel.app` |
| `ADMIN_CORS` | ✅ prod | Same as storefront or admin origin |
| `AUTH_CORS` | ✅ prod | Same as ADMIN_CORS |
| `NODE_ENV` | | `production` |

Plus payment providers (Lemon Squeezy, Stripe, etc.) and optional services (Resend, AfterShip). See `apps/medusa/.env.template`.

---

## Health check

Medusa exposes `/health`. Fly.io probes automatically via the `path` in `fly.toml`.

---

## After deploy

1. Get the Fly app URL (e.g. `https://maharlika-apparel-custom.fly.dev`).
2. Set `MEDUSA_BACKEND_URL` / `NEXT_PUBLIC_MEDUSA_URL` in your storefront and admin env.
3. Update `STORE_CORS` and `ADMIN_CORS` to include your storefront and admin origins.
4. Point Lemon Squeezy and AfterShip webhooks to `https://maharlika-apparel-custom.fly.dev/...`.
