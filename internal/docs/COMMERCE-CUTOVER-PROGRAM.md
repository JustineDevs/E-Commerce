# Commerce cutover — 7-PR program + release gates

Execution order: stabilize boundaries → Medusa authoritative → webhooks → admin → data/infra → safety → tests + deletion. Each PR is a rollback boundary.

---

## Not in this phase (explicit control)

The following are **out of scope** for PR-1 … PR-7 unless a separate **post-cutover expansion PR** is opened:

- GCash manual proof flow  
- COD logistics (beyond existing COD module configuration)  
- Full shipping-zone expansion  
- Permanent dual-write between Supabase and Medusa  
- Extra payment methods beyond the first stabilized core provider  
- Removal of audit trails, webhook logs, or replay / idempotency records  

**Rule:** No PR in this program may introduce the above. If a dependency forces one in early, record it as **BLOCKED** with a named external dependency, not as a silent scope add.

---

## PR-1 — Commerce ownership freeze

**Goal:** Medusa is the only writer of commerce truth; legacy Express is read-only or flag-disabled.

**Files changed:** `internal/docs/CUTOVER-COMMERCE-OWNERSHIP.md`, `apps/api/src/lib/legacyCommerceGate.ts` (behavior unchanged; documented), `apps/api/src/index.ts` (mount conditions).

**Data migrations:** None.

**Env:** `LEGACY_COMMERCE_API_DISABLED`, `LEGACY_EXPRESS_WEBHOOKS_DISABLED` (documented in root `.env.example`).

**Runtime impact:** Legacy routes return 410 when flags set.

**Test plan:** Hit `/checkout` with flag on → 410.

**Rollback plan:** Set `LEGACY_*=false` in dev/staging; in production unset already defaults legacy off — set `=false` to opt in temporarily.

**Cutover effect:** Team can state one owner for paid orders (Medusa).

**Done when:** No new feature writes both Medusa and legacy commerce rows for the same order; doc published.

---

## PR-2 — Storefront Medusa-first

**Goal:** Catalog/shop paths fail loud on misconfig or API errors.

**Files changed:** `apps/storefront/src/lib/catalog-fetch.ts`, shop/home/collections/product pages, storefront alert component.

**Data migrations:** None.

**Env:** `NEXT_PUBLIC_MEDUSA_*`, `MEDUSA_*` (existing).

**Runtime impact:** Broken config shows explicit UI, not empty grid.

**Test plan:** Remove publishable key locally → misconfigured banner.

**Rollback plan:** Revert catalog-fetch + pages.

**Cutover effect:** No silent empty catalog.

**Done when:** Acceptance criteria in program spec for PR-2 met.

---

## PR-3 — Webhook single-owner cutover

**Goal:** One active endpoint per provider per env; idempotent handlers.

**Files changed:** `internal/docs/WEBHOOK-CUTOVER-CHECKLIST.md`, Medusa + Express webhook handlers (dedupe already present).

**Data migrations:** Existing `webhook_events` / `lemon_webhook_dedup` as applicable.

**Env:** Secrets only in `apps/medusa/.env` for Medusa-owned webhooks.

**Runtime impact:** Legacy Express webhooks off in prod when flag set.

**Test plan:** Duplicate POST → no double charge / double fulfillment.

**Rollback plan:** Re-enable Express webhook URL + unset flag (emergency only).

**Cutover effect:** No dual mutation paths.

**Done when:** Lemon + AfterShip each single target; duplicate delivery safe.

---

## PR-4 — Admin and BFF hardening

**Goal:** Staff session + role on all admin UI and admin API routes; internal API key on BFF proxy.

**Files changed:** `apps/admin/src/lib/auth.ts`, `apps/admin/src/middleware.ts`, `apps/admin/src/lib/requireStaffSession.ts`, `apps/admin/src/app/api/**/route.ts`.

**Data migrations:** None.

**Env:** `ADMIN_ENFORCE_STAFF`, `ADMIN_ALLOWED_EMAILS`, `INTERNAL_API_KEY`.

**Runtime impact:** Non-staff JWT cannot access `/admin` or staff API routes.

**Test plan:** Denial tests (no session, wrong role, missing key on proxy).

**Rollback plan:** Revert middleware + auth callbacks.

**Cutover effect:** No anonymous admin surfaces.

**Done when:** All listed denial cases return 401/403.

---

## PR-5 — Data and infra hardening

**Goal:** `LEGACY_DATABASE_URL` vs Medusa `DATABASE_URL`; CORS and health clarity.

**Files changed:** `packages/database/scripts/*.ts`, `.env.example`, `apps/medusa/.env.example`, health routes.

**Data migrations:** None (variable rename only).

**Env:** `LEGACY_DATABASE_URL`, Medusa `STORE_CORS` / `ADMIN_CORS` / `AUTH_CORS`.

**Runtime impact:** Scripts use legacy URL; Medusa uses `DATABASE_URL` only.

**Test plan:** Health endpoints for api + Medusa reachability.

**Rollback plan:** Restore script env name in branch.

**Cutover effect:** No accidental DB mix-ups in ops.

**Done when:** Deployment configs reviewed against checklist.

---

## PR-6 — Safety and performance controls

**Goal:** Rate limits on Medusa store traffic; correlation IDs; structured logging on payment/fulfillment paths.

**Files changed:** `apps/medusa/src/api/middlewares.ts`, request id propagation where applicable.

**Data migrations:** None.

**Env:** `MEDUSA_STORE_RATE_LIMIT_MAX` (optional).

**Runtime impact:** 429 on abusive store traffic; logs traceable.

**Test plan:** Burst `/store` routes → 429.

**Rollback plan:** Remove or widen middleware matcher.

**Cutover effect:** Abuse surface reduced.

**Done when:** Rate limit + logging acceptance met.

---

## PR-7 — Test and deletion pass

**Goal:** Integration tests for webhooks; one E2E checkout path; legacy routes hard-disabled or removed.

**Files changed:** `apps/api` tests, `e2e/`, `apps/api/src/index.ts` (route mounts), `apps/api/src/lib/legacyCommerceEnv.ts` (production defaults when unset).

**Data migrations:** None.

**Env:** Production defaults for legacy flags documented in root `.env.example`; `NODE_ENV=production` + unset `LEGACY_*` → legacy off without setting vars.

**Runtime impact:** Legacy commerce and Express webhooks stay off in production unless explicitly opted in (`=false`).

**Note:** Legacy route **implementations** remain in the repo for emergency opt-in; they are not mounted when disabled.

**Test plan:** CI runs integration + E2E.

**Rollback plan:** Revert test PR; restore routes only in emergency branch.

**Cutover effect:** Single tested paid path.

**Done when:** Legacy cannot be re-enabled without deliberate config.

---

## Release gates (all must pass before production cutover)

1. Medusa storefront parity complete (Gate 1)  
2. Webhook single-owner verified in staging (Gate 2)  
3. Admin route denial tests passing (Gate 3)  
4. DB/env separation verified in deployment configs (Gate 4)  
5. E2E checkout path passing (Gate 5)  
6. Legacy commerce handlers disabled (Gate 6)  
7. Production cutover checklist signed off (Gate 7)  

A release **fails** if any gate fails.

---

## Delivery block template (use per PR)

- **Goal**  
- **Files changed**  
- **Data migrations**  
- **Env changes**  
- **Runtime impact**  
- **Test plan**  
- **Rollback plan**  
- **Cutover effect**  
- **Done-when checklist**  
