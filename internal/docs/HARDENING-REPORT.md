# Production Hardening Report

**Date:** 2026-03-20
**Scope:** Full-stack audit and fix pass across the Apparel Commerce monorepo

---

## Executive Summary

This hardening pass addressed 18 issues across 6 priority tiers. All Critical and High items are resolved. The monorepo now enforces fail-closed behavior for all webhook dedup paths, wires end-to-end authentication for both storefront and admin apps, validates environment variables at boot for all payment providers, and surfaces errors instead of silently swallowing them.

---

## Changes by Phase

### Phase 1: Critical Invariants (C1–C5)

| ID | Issue | Resolution | Files |
|----|-------|-----------|-------|
| C1 | Storefront auth not wired end-to-end | Created `lib/auth.ts`, `NextAuthSessionProvider`, middleware protecting `/account`, session-aware account page | `apps/storefront/src/lib/auth.ts`, `apps/storefront/src/components/NextAuthSessionProvider.tsx`, `apps/storefront/middleware.ts`, `apps/storefront/src/app/(public)/account/page.tsx`, `apps/storefront/src/app/api/auth/[...nextauth]/route.ts`, `apps/storefront/src/app/layout.tsx` |
| C2 | Admin has no logout button | Wired `signOut()` in `AdminSidebar`, added `NextAuthSessionProvider` to admin layout | `apps/admin/src/components/AdminSidebar.tsx`, `apps/admin/src/components/NextAuthSessionProvider.tsx`, `apps/admin/src/app/layout.tsx` |
| C3 | Lemon webhook dedup fails open when DATABASE_URL missing | Changed to return `false` (fail-closed) with warning log | `apps/medusa/src/lib/lemon-webhook-dedup.ts` |
| C4 | Paymongo webhook has no idempotency | Created dedup module, integrated into payment provider webhook handler | `apps/medusa/src/lib/paymongo-webhook-dedup.ts`, `apps/medusa/src/modules/paymongo-payment/service.ts` |
| C5 | Supabase client falls back to anon key in production | Production now requires `SUPABASE_SERVICE_ROLE_KEY`; anon fallback restricted to dev with warning | `packages/database/src/index.ts` |

### Phase 2: High-Priority Fixes (H1–H6)

| ID | Issue | Resolution | Files |
|----|-------|-----------|-------|
| H1 | Medusa env validation missing Lemon Squeezy and PayPal | Added production-time validation schemas for all 4 payment providers + partial-config warnings for Resend/AfterShip | `apps/medusa/src/loaders/validate-process-env.ts` |
| H2 | AfterShip webhook has no idempotency | Created dedup module keyed on `orderId + tag`, integrated into webhook route | `apps/medusa/src/lib/aftership-webhook-dedup.ts`, `apps/medusa/src/api/hooks/aftership/route.ts` |
| H3 | Express health check does not probe Supabase | Added `checkSupabase()` to health endpoint; returns `degraded`/503 when either Medusa or Supabase is down | `apps/api/src/routes/health.ts` |
| H4 | Express health uses raw env var instead of SDK for Medusa URL | Replaced with `getMedusaStoreBaseUrl()` from `@apparel-commerce/sdk` | `apps/api/src/routes/health.ts`, `apps/api/package.json` |
| H5 | Admin middleware only covers `/admin` — POS/Medusa API routes unprotected | Extended matcher to include `/api/pos/:path*` and `/api/medusa/:path*` | `apps/admin/src/middleware.ts` |
| H6 | POS page silently swallows fetch errors | Added error state, HTTP status check, and visible error banner | `apps/admin/src/app/(dashboard)/admin/pos/page.tsx` |

### Phase 3: Consolidation (M1, M5, M6, L1, L3)

| ID | Issue | Resolution | Files |
|----|-------|-----------|-------|
| M1 | Duplicate default storefront origin helper in Medusa | Replaced local import with `@apparel-commerce/sdk`'s `DEFAULT_PUBLIC_SITE_ORIGIN`; deleted dead file | `apps/medusa/src/modules/paypal-payment/service.ts`, deleted `apps/medusa/src/lib/default-storefront-origin.ts` |
| M5 | `logWithRequest` function unused in requestId module | Removed dead function and unused `logInfo` import | `apps/api/src/lib/requestId.ts` |
| M6 | Legacy Supabase commerce helpers not marked deprecated | Added `@deprecated` JSDoc to `packages/database/src/legacy.ts` | `packages/database/src/legacy.ts` |
| L3 | NEXTAUTH_SECRET not validated at storefront boot | Throws in production if empty; warns if Google OAuth credentials are missing | `apps/storefront/instrumentation.ts` |

### Phase 4: Reliability & Observability (M4)

| ID | Issue | Resolution | Files |
|----|-------|-----------|-------|
| M4 | Express API silently bypasses auth in dev with no warning | Added `logStartup` warning when `INTERNAL_API_KEY` is unset in non-production | `apps/api/src/index.ts` |

### Phase 5: Test Coverage

| Test File | What It Covers |
|-----------|---------------|
| `apps/medusa/src/loaders/validate-process-env.stress.test.ts` | Extended with Lemon Squeezy, PayPal, and no-provider production scenarios |
| `apps/medusa/src/lib/lemon-webhook-dedup-failclosed.stress.test.ts` | Dedup ID stability, uniqueness, null on missing data |
| `apps/medusa/src/lib/paymongo-webhook-dedup.stress.test.ts` | Dedup ID stability, uniqueness, null on missing data |
| `apps/medusa/src/lib/aftership-webhook-dedup.stress.test.ts` | Dedup ID stability, tag-based uniqueness, undefined tag fallback |
| `apps/api/src/lib/logger.test.ts` | Extended with substring-key safety, array sanitization, null/undefined handling |

---

## Remaining Items (Not Addressed)

These were out of scope for this pass but should be tracked:

1. **Storefront order history** — The `/account` page shows a placeholder. Needs Medusa customer API integration to fetch real orders.
2. **RLS enforcement** — Supabase Row-Level Security policies should be audited for the `users` and `compliance_*` tables.
3. **Webhook dedup table cleanup** — The `*_webhook_dedup` tables grow indefinitely. Add a cron job or Medusa scheduled job to prune entries older than 30 days.
4. **Rate limiting on storefront auth** — The NextAuth routes (`/api/auth/*`) have no rate limiting. Consider edge middleware or provider-level throttling.
5. **E2E tests** — No Playwright/Cypress tests exist. Critical paths (checkout, sign-in, webhook processing) should have E2E coverage before launch.

---

## Environment Variables Added/Changed

| Variable | Where Used | Required | Notes |
|----------|-----------|----------|-------|
| `NEXTAUTH_SECRET` | Storefront | Production | Now validated at boot; throws if empty |
| `GOOGLE_CLIENT_ID` | Storefront, Admin | Production | Warning if missing (OAuth won't work) |
| `GOOGLE_CLIENT_SECRET` | Storefront, Admin | Production | Warning if missing |
| `SUPABASE_SERVICE_ROLE_KEY` | `packages/database` | Production | Now required in production; no anon fallback |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Medusa | When API key set | Now validated at boot |
| `PAYPAL_CLIENT_SECRET` | Medusa | When client ID set | Now validated at boot |
