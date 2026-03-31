# Executive audit report

**Repo:** Turborepo monorepo (Medusa, storefront Next.js, admin Next.js, Express `apps/api`, terminal agent, shared `packages/*`).  
**Evidence standard:** Static code review and architecture tracing. Full runtime E2E proof against live credentials was not executed in this pass (mark as runtime-unproven where relevant).

**Note (2026-03-31):** Several admin and catalog flows were extended after this report was written. See `README.md` in this folder for how to use these documents. Open risks below remain valid until addressed in code or CI.

## Overall verdict

**Conditionally ready for disciplined operators.** The stack has clear ownership boundaries (Medusa for commerce, Supabase for platform data) and several hardened paths (Express compliance behind `INTERNAL_API_KEY`, production boot guard). Gaps remain in dual-session surfaces (customer vs staff), BYOK operational complexity, webhook and idempotency assurance across all PSPs, and honest UI states when backends are partial or down.

## Top risks

| Risk | Severity | Why |
|------|----------|-----|
| Service role and BYOK secrets in process env at Medusa boot | High | Same ciphertext as admin, but any Medusa host compromise exposes decrypted env; rotation and audit depend on operator discipline. |
| Storefront middleware runs `withAuth` on almost all routes | Medium | Broad matcher increases auth edge cases; account gating depends on token shape and NextAuth config staying aligned. |
| Admin integration routes (`chat-orders/intake`) | Medium | When `INTERNAL_CHAT_INTAKE_KEY` is unset, path falls through to staff session auth (fail-closed for anonymous bots is OK; wrong-key behavior is NextAuth, not a clean 401 JSON). |
| Partial provider env (Resend, Redis fake, tracking HMAC) | Medium | Medusa can boot with warnings while customer-facing features are degraded; operators may not notice until production. |
| Reviews and loyalty bridge tables | Medium | UGC and ledger sit on Supabase while orders are Medusa; consistency under abuse or admin moderation errors is application-level, not DB-enforced across both. |

## Top gaps

- End-to-end automated proof of checkout for every PSP in CI (runtime-unproven here).
- Uniform structured error contracts from all admin BFF routes to the UI (many routes, heterogeneous patterns).
- Single observable dashboard for "platform credentials loaded" vs "Medusa env only" (BYOK vs file env).

## Top weaknesses

- ESLint warnings in storefront `analytics.ts` and several admin components (unused params); noise hides real regressions if CI tightens.
- Next.js ESLint plugin warning on admin and storefront builds: lint config drift from Next recommendations.
- Stress and dedup tests removed or reduced in Medusa per git status history; regression risk for webhooks.

## Top caveats

- Comments and route names do not guarantee wiring; several CMS and analytics paths are best-effort when Supabase or Medusa is slow.
- `redisUrl not found` uses a fake Redis in dev; production must set real Redis if modules expect it.

## Top sad-path failures

- Medusa unavailable: storefront pages that SSR catalog will error or empty depending on fetch helpers; checkout must fail visibly.
- Supabase unavailable for platform features: admin CMS, audit, payment connection UI, loyalty admin paths degrade; Medusa commerce may still run if env keys are file-based.
- Expired staff session: middleware redirects to `/sign-in`; API routes return 401 depending on handler (verify each group).

## What is strong

- Documented `packages/database/src/data-boundaries.ts` Medusa vs Supabase split.
- Express `/compliance` stack: rate limit, `requireInternalApiKey`, production boot fail without key.
- BYOK emitter `apps/medusa/src/scripts/emit-platform-payment-env.ts` uses dynamic `import()` for ESM crypto package (avoids TS1479 CJS static import error).
- `apply-platform-payment-env.ts` centralizes platform credential hydration for Medusa.

## What is fragile

- Any synchronous `execFileSync` during Medusa config load (platform credentials): slow or hanging Supabase hurts boot.
- Cross-app env duplication (storefront vs admin vs Medusa base URLs) invites drift.

## What must be fixed first

1. Confirm `pnpm run build` passes on a clean tree after pulling latest (Medusa TS1479 fix is in repo: dynamic import in emitter script).
2. Restore or replace webhook dedup stress coverage where payment modules changed.
3. Tighten admin integration route responses for invalid internal keys (explicit 401/403 JSON vs session redirect) if those endpoints are machine clients.

---

## Final verdict headings (required)

### What is solid

Architecture map in AGENTS and data-boundaries; Express compliance gating; Medusa as commerce SoR; workspace package layout.

### What is partially built

BYOK across admin UI, crypto package, and Medusa boot sync; CMS-driven redirects; loyalty bridge; campaign tooling.

### What is misleading

UI that implies "connected" payment or email without a verified end-to-end path; any page that shows empty grids without distinguishing "no data" vs "fetch failed".

### What is dangerous

Shared service role on Medusa for BYOK load; missing or partial webhook secrets in production; dev-only unprotected compliance if `INTERNAL_API_KEY` unset.

### What is duplicated

Env resolution scattered across `packages/sdk`, app `.env` files, and Medusa validators; possible overlap in catalog helpers vs Medusa SDK usage (verify per feature).

### What is weak in sad paths

Timeouts and retries across Medusa from Next.js route handlers; operator actions without idempotency keys on some admin flows.

### What should be deleted

Dead test files and unused analytics stub parameters if they remain no-ops (see `delete_or_refactor_next.md`).

### What should be refactored

Consolidate payment env application documentation in one operator runbook; align ESLint with Next.js plugin expectations.

### What should be secured next

BYOK KMS assumptions, audit logging on decrypt and rotate, RLS review on `payment_connections` and staff tables.

### What should be tested next

Checkout per PSP, admin payment connection verify/rotate, compliance export/erasure with internal key, POS commit sale under offline queue.
