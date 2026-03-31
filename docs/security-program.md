# Security program (operator checklist)

This document is the **live** counterpart to archived notes under `output/full-application-audit/`. It encodes what the repo enforces in CI and at boot.

## 1. Payment credentials (BYOK mandate)

- **Production Medusa** requires `PAYMENT_CREDENTIALS_SOURCE=platform` or `supabase` unless `MEDUSA_BYOK_MANDATE_OFF=1` (break-glass only).
- Encrypted rows live in Supabase `payment_connections`; Medusa decrypts at boot via `emit-platform-payment-env`.
- **Env removal:** When BYOK is active, do not keep plaintext PSP secrets in deployment env files. They would duplicate the source of truth and confuse rotation.
- **Observability:** Medusa admin route `GET /admin/payment-health` returns `byokPolicy` (`productionByokMandateActive`, `productionByokMandateMet`, `mandateBreakGlass`) plus `credentialSource` and provider flags (no secret values).

## 2. Automated gates (CI and release)

| Check | Script / workflow |
| --- | --- |
| Dependency audit triage | `scripts/check-audit-triage.js` |
| Storefront client bundle (no server secrets) | `scripts/check-storefront-client-boundary.mjs` |
| Legacy DB migrations vs Medusa commerce tables | `scripts/check-commerce-migration-boundary.mjs` |
| Admin API routes must show staff or internal guard patterns | `scripts/check-admin-api-staff-guard.mjs` |
| Unit tests (incl. Medusa env validation, admin webhook policy) | `pnpm test`, `pnpm release-gate` |

GitHub Actions workflow: `.github/workflows/security-audit.yml`.

## 3. Internal and staff surfaces

- **Express** compliance and health: `INTERNAL_API_KEY` required in production (`apps/api`).
- **Admin** App Router APIs: expected to call `requireStaffSession`, `getServerSession`, or an approved internal/HMAC pattern (enforced by `check-admin-api-staff-guard.mjs`).
- **Channel webhook** (`/api/integrations/channels/webhook`): `CHANNEL_WEBHOOK_SECRET` required on Vercel production and on non-Vercel `NODE_ENV=production`; HMAC verified with constant-time compare (`channel-webhook-signature.ts`).

## 4. Ongoing work (not fully automatable)

- E2E checkout per enabled PSP and webhook deduplication (see `output/full-application-audit/gap_register.md` C1). This is release-gate and fixture work across apps, not a single-file change.
- Service role key on Medusa: treat as break-glass-capable; network restrict Medusa, rotate on schedule, audit Supabase access logs where available.
- Periodic RLS and rate-limit review on public storefront routes and whenever `payment_connections` policies change.
- Secret redaction review when logging admin API errors.
- **BYOK sync vs async:** boot uses `emit-platform-payment-env` with per-provider `pickBest` (region preference). Async refresh applies all eligible rows and last write wins per env key; prefer one active row per provider or rely on sync restart after admin changes until async selection logic matches emit.

## 5. BYOK path review (zero-trust gaps)

Medusa production boot uses `apply-platform-payment-env` / `apply-platform-payment-env-async` with decryption via `@apparel-commerce/payment-connection-crypto` and rows in `payment_connections`.

| Gap | Risk | Repo mitigations (verify in your environment) |
| --- | --- | --- |
| **`process.env` after decrypt (required)** | Memory / crash dumps; env visible to extensions | **Intentional:** Medusa payment modules read fixed env names at bootstrap. BYOK assigns decrypted values to those names (`payment-provider-secret-env-map.ts` + sync emit script). Mitigations: redacted logs, no env dumps, shorten poll interval during rotation; removing env use needs upstream Medusa/plugin APIs |
| **Stale / degraded BYOK** | Old keys after rotation | `GET /admin/payment-health` includes `byokAsync` (`decryptFailures`, `connectionsEligible`, `operatorAlertRecommended`) and top-level `byokAttentionRecommended`; shorten `BYOK_LAZY_POLL_INTERVAL_MS` during rotations |
| **Duplicate / dead loaders** | Wrong mental model | Unused `byok-lazy-hydration.ts` removed; ADR-0001 aligned with sync + async loaders |
| **Service role on Medusa** | Full read of `payment_connections` | Operational: network restrict Medusa, rotate service role key, lock down Medusa admin |
| **Admin API leaks** | Errors or logs echo secrets | `safePaymentConnectionClientError` on payment-connection routes; `logAdminApiEvent` redacts sensitive keys in `detail` |
| **RLS** | Policy drift | Re-run RLS review when migrations change (`016_rls_payment_connections_staff.sql` lineage) |

**Architectural contract (not a defect):** After decrypt, credentials are written to `process.env` under the names `medusa-config.ts` and providers expect. That matches Medusa v2’s configuration model. Eliminating `process.env` as the carrier would require injectable secret resolvers in Medusa and vendor modules (upstream). **Operational / test backlog (multi-step):** least-privilege and rotation cadence for `SUPABASE_SERVICE_ROLE_KEY` on Medusa, periodic RLS policy review when migrations touch `payment_connections`, full PSP checkout E2E and webhook deduplication coverage (see §4).

Staff admin sign-in is **Google-only** on `/sign-in`. E2E credentials exist only on `/sign-in/e2e` when `NODE_ENV=development` and E2E env is set (`admin-allowed-emails.ts`).

## 6. References

- `docs/data-ownership.md` and `packages/database/src/data-boundaries.ts` for Medusa vs Supabase ownership.
- `apps/medusa/src/loaders/validate-process-env.ts` for production env rules.
- `docs/archived/adr/0001-byok-credential-management.md` (note: reconcile with actual Medusa loaders as in section 5).
