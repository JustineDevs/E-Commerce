# Gap register

Grouped by severity. Each entry is markdown structured (not CSV).

**Status:** See `README.md` in this folder. This list is still accurate for **open** work; some admin UX and catalog flows were improved in the repo after the original audit export (not every line below was re-verified).

## Critical

### C1: Runtime proof gap for money-moving flows
- **Area:** Checkout, webhooks, refunds, POS commit.
- **Description:** Automated E2E proof across all enabled PSPs and webhook dedup is not evidenced in this audit pass.
- **Evidence:** Audit is static; stress tests removed in git history for several webhook modules.
- **Impact:** Regressions ship silently.
- **Recommendation:** Restore targeted integration tests and smoke `stress-test` jobs for payments.

### C2: Fine-grained RBAC coverage unverified for new admin APIs
- **Area:** `apps/admin/src/app/api/admin/**` including new `payment-connections`, `reviews`, `profile`, `storefront-public-metadata`.
- **Description:** Middleware only checks coarse role; per-route permission may be missing on new routes.
- **Evidence:** Large surface in git status; no line-by-line verification in this document.
- **Impact:** Privilege escalation or accidental open handler if one route skips checks.
- **Recommendation:** Grep `requireStaffSession` and permission helpers on every new route file; add deny tests.

## High

### H1: Medusa boot depends on synchronous Supabase fetch for BYOK
- **Area:** `apply-platform-payment-env.ts`, emitter script.
- **Description:** `execFileSync` blocks startup; Supabase latency or outage prevents Medusa start when platform credentials enabled.
- **Evidence:** `apps/medusa/src/lib/apply-platform-payment-env.ts`.
- **Impact:** Commerce down when platform DB has transient issues even if file env would work.
- **Recommendation:** Document fallback to file env for break-glass; consider timeout and degrade with explicit fatal log.

### H2: Channel webhook depends on env gate and secret (verified handler)
- **Area:** `/api/integrations/channels/webhook`.
- **Description:** Middleware allows unauthenticated access; the route uses `gateChannelWebhookSecretConfigured` and HMAC-SHA256 `verifySignature` with `timingSafeEqual` when `CHANNEL_WEBHOOK_SECRET` is set (`apps/admin/src/app/api/integrations/channels/webhook/route.ts`).
- **Evidence:** Handler lines 10-50; middleware bypass at `apps/admin/src/middleware.ts` lines 23-25.
- **Impact:** If production gate ever allowed missing secret, requests would be unsafe; confirm `gateChannelWebhookSecretConfigured` is strict in production.
- **Recommendation:** Add an automated test that POST without signature returns 401 when secret is configured.

## Medium

### M1: ESLint Next plugin not integrated
- **Area:** Storefront and admin builds.
- **Description:** Next warns ESLint config missing Next plugin.
- **Evidence:** User build log.
- **Impact:** Missed Next-specific lint rules.
- **Recommendation:** Migrate eslint config per Next docs link in warning.

### M2: Tracking link HMAC optional in some configs
- **Area:** Email and tracking.
- **Description:** Medusa env validator warns when Resend works but HMAC secret missing.
- **Evidence:** `validate-process-env.ts` message in grep results.
- **Impact:** Guessable tracking URLs.
- **Recommendation:** Enforce in production profile or downgrade feature explicitly in UI.

## Low

### L1: Unused parameters in analytics stubs
- **Area:** `apps/storefront/src/lib/analytics.ts`.
- **Description:** Lint noise from unused `action` and `data`.
- **Evidence:** Build log warnings.
- **Impact:** Developer fatigue.
- **Recommendation:** Prefix with `_` or implement real tracking.
