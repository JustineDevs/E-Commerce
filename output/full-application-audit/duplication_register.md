# Duplication register

## D1: Environment resolution
- **Where:** `packages/sdk` env helpers, per-app `process.env` reads, Medusa `validate-process-env.ts`.
- **Issue:** Same variable names documented in multiple places; drift risk.
- **Recommendation:** Single source of documented names in `packages/sdk` with generated `.env.example` sections if feasible.

## D2: Medusa HTTP client helpers
- **Where:** `apps/admin/src/lib/medusa-admin-http.ts`, `medusa-pos.ts`, and similar.
- **Issue:** Overlapping fetch wrappers and error parsing.
- **Recommendation:** Consolidate one low-level client with typed errors.

## D3: Cart merge and attach flows
- **Where:** Multiple `apps/storefront/src/app/api/cart/*` routes.
- **Issue:** Similar validation and Medusa calls repeated.
- **Recommendation:** Shared internal module for cart context resolution.

## D4: Audit and actor formatting
- **Where:** New `audit-actor-format.ts` in admin; other routes may still format ad hoc.
- **Issue:** Inconsistent audit log detail shape.
- **Recommendation:** Single formatter used by all admin mutations.

## D5: Payment provider secret shapes
- **Where:** Admin `payment-connections.ts`, Medusa emitter script, Medusa payment modules.
- **Issue:** Parallel TypeScript types for same JSON; schema change needs three edits.
- **Recommendation:** Shared Zod or types package for `ProviderSecrets` used by admin and emitter only (Medusa runtime stays env strings).

## D6: NextAuth configuration patterns
- **Where:** `apps/storefront` and `apps/admin` auth config.
- **Issue:** Duplication is intentional but copies can drift (providers, callbacks).
- **Recommendation:** Shared package for common callbacks only where roles differ minimally.
