# Operator Notes: Post-Hardening Checklist

**Date:** 2026-03-20

Use this checklist when deploying the hardening changes to staging or production.

---

## Vercel (Storefront) Configuration

**Root Directory:** Set to `apps/storefront` in Vercel Project Settings → General → Root Directory. This ensures:
- `apps/storefront/vercel.json` is used (build filtered to storefront only)
- Next.js is correctly detected
- Medusa is excluded from the build (Medusa runs on Railway/Render/VPS, not Vercel)

If Root Directory is the repo root, the root `vercel.json` limits the build to the storefront, but you should still set Root Directory to `apps/storefront` for correct Next.js deployment.

---

## Pre-Deploy Checklist

### 1. Environment Variables

Verify these are set in your deployment environment:

```bash
# Storefront (apps/storefront)
NEXTAUTH_SECRET=        # Required in production. Generate: openssl rand -base64 32
GOOGLE_CLIENT_ID=       # Required for OAuth sign-in
GOOGLE_CLIENT_SECRET=   # Required for OAuth sign-in
NEXTAUTH_URL=           # Full URL of the storefront (e.g. https://store.example.com)

# Medusa (apps/medusa) — payment providers validated at boot
LEMONSQUEEZY_WEBHOOK_SECRET=   # Required when LEMONSQUEEZY_API_KEY is set
PAYPAL_CLIENT_SECRET=          # Required when PAYPAL_CLIENT_ID is set
STRIPE_WEBHOOK_SECRET=         # Required when STRIPE_API_KEY is set
PAYMONGO_WEBHOOK_SECRET=       # Required when PAYMONGO_SECRET_KEY is set

# Database (packages/database)
SUPABASE_SERVICE_ROLE_KEY=     # Required in production (anon key fallback disabled)

# Express API (apps/api)
INTERNAL_API_KEY=              # Set this to protect compliance endpoints
```

### 2. Database Migrations

The webhook dedup tables auto-create on first webhook:
- `lemon_webhook_dedup` — Lemon Squeezy
- `paymongo_webhook_dedup` — Paymongo
- `aftership_webhook_dedup` — AfterShip

No manual migration required. Tables use `CREATE TABLE IF NOT EXISTS`.

### 3. Auth Flow Verification

After deploy, verify:

1. **Storefront sign-in:** Visit `/sign-in` → click Google → redirected back with session
2. **Storefront account:** Visit `/account` unauthenticated → redirected to `/sign-in`
3. **Storefront sign-out:** On `/account` → click Sign out → session cleared
4. **Admin sign-in:** Visit `/admin` → Google OAuth → lands on dashboard
5. **Admin sign-out:** Click Logout in sidebar → redirected to `/`
6. **Admin API protection:** `GET /api/pos/medusa/quick-products` without session → 401

---

## Post-Deploy Monitoring

### Health Endpoint

```bash
curl https://api.example.com/health
# Expected: {"status":"ok","medusa":"ok","supabase":"ok","timestamp":"..."}
# If degraded: {"status":"degraded","medusa":"unavailable","supabase":"ok",...}
```

Returns HTTP 503 if any dependency is down.

### Webhook Dedup

Monitor for duplicate warnings in logs:
```
[lemon-dedup] DATABASE_URL not set — rejecting webhook
[paymongo-dedup] DATABASE_URL not set — rejecting webhook
[aftership-dedup] DATABASE_URL not set — rejecting webhook
```

These indicate `DATABASE_URL` is not available to the dedup layer. All three dedup modules are **fail-closed** — they reject webhooks rather than risk duplicate processing.

### Dev Auth Bypass

In non-production, if you see:
```json
{"level":"warn","msg":"INTERNAL_API_KEY is not set — compliance endpoints are unprotected (dev only)"}
```

This is expected in development. Set `INTERNAL_API_KEY` to enable auth.

---

## Dedup Table Maintenance

Schedule a weekly cleanup for the dedup tables:

```sql
DELETE FROM lemon_webhook_dedup WHERE created_at < NOW() - INTERVAL '30 days';
DELETE FROM paymongo_webhook_dedup WHERE created_at < NOW() - INTERVAL '30 days';
DELETE FROM aftership_webhook_dedup WHERE created_at < NOW() - INTERVAL '30 days';
```

---

## Rollback

All changes are backward-compatible. To rollback:

1. **Auth wiring:** Remove `middleware.ts` from storefront root. Session features degrade gracefully — account page shows sign-in prompt.
2. **Fail-closed dedup:** Revert to `return true` in dedup modules if webhooks are being rejected. This re-opens the duplicate risk.
3. **Supabase key enforcement:** Set `SUPABASE_SERVICE_ROLE_KEY` or revert `packages/database/src/index.ts` to allow anon key fallback.
4. **Env validation:** Comment out the new validation functions in `validate-process-env.ts` if blocking deploy.
