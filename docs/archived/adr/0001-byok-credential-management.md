# ADR-0001: BYOK Credential Management

## Status

**Superseded (2026-03-31).** The repository no longer implements Supabase BYOK for payment credentials. Medusa PSP keys are configured only via environment variables. This document is kept for historical context.

## Previous status

Accepted (superseded)

## Date
2026-03-31

## Context
Payment provider credentials (API keys, webhook secrets, client IDs) must be available at runtime for Medusa and API routes. Storing them as environment variables creates operational friction during rotation and multi-provider management. Hard-coded secrets in `.env` files risk leakage and lack audit trails.

## Decision
Adopt a Bring Your Own Keys (BYOK) model where credentials are stored in Supabase `payment_connections` table and hydrated at runtime.

### Architecture
1. Credentials stored in `public.payment_connections` (Supabase) with RLS policies restricting access to service_role (**table removed**; see `013_drop_legacy_payment_connections.sql` in the platform migration set).
2. **Medusa boot (sync):** `apps/medusa/src/lib/apply-platform-payment-env.ts` runs `src/scripts/emit-platform-payment-env.ts`, which decrypts `secret_ciphertext` via `@apparel-commerce/payment-connection-crypto` and prints env key JSON for `process.env`.
3. **Medusa runtime refresh (async):** `apps/medusa/src/lib/apply-platform-payment-env-async.ts` loads the same rows on an interval (`BYOK_LAZY_POLL_INTERVAL_MS`, default 5 minutes) when `PAYMENT_CREDENTIALS_SOURCE` is `platform` or `supabase`. Exposes health via `getByokHealthStatus()` and `GET /admin/payment-health` (`operatorAlertRecommended`, decrypt failure counts).
4. Admin dashboard manages connections through staff API routes (`apps/admin/src/app/api/admin/payment-connections/*`) with audit logging; client-facing errors sanitize crypto-related failures.
5. Ciphertext at rest; decrypt only on server. Production Medusa logs omit raw subprocess or decrypt exception text where noted in `docs/security-program.md`.

### Process.env as the integration boundary
Medusa v2 evaluates `medusa-config.ts` using `process.env` when assembling payment provider modules (for example `@medusajs/payment-stripe` and custom modules under `src/modules/*-payment`). Official and custom providers expect string options resolved from env-style configuration at bootstrap. **BYOK therefore assigns decrypted ciphertext fields to specific `process.env` names** before and during runtime (sync subprocess path plus optional async refresh). A design that kept secrets only in a private object without populating `process.env` would require Medusa or each plugin to accept injectable credential providers; that is upstream to this repository. Field names for the async path are centralized in `apps/medusa/src/lib/payment-provider-secret-env-map.ts` and must stay aligned with `src/scripts/emit-platform-payment-env.ts`.

### Validation at Boot
- `validate-process-env.ts` checks required credential sets per enabled provider
- Missing credentials log structured warnings, not hard crashes
- Feature flags control which providers are active

### Rotation
- Update `payment_connections` in Supabase
- Medusa picks up changes on next async poll or process restart (sync path runs once at boot)
- Rotation runbook: `docs/runbooks/secrets-rotation.md`

## Consequences
- No production PSP secrets required in `.env` when platform BYOK is active
- Credential rotation can avoid full redeploy when using async refresh
- Supabase or decrypt failures surface on `payment-health` for operators (`byokAttentionRecommended`)
- Audit trail for credential changes in Supabase
- CI tests use sandboxed test credentials injected via GitHub Secrets
