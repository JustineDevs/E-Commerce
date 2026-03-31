# Drift register

## DR1: `data-boundaries` surfaces vs Medusa BYOK reader
- **Expected:** All consumers of `payment_connections` listed honestly.
- **Actual:** Surfaces array listed `admin` and `api`; Medusa reads via script with service role.
- **Fix applied:** Extended `notes` on `payment_connections` in `packages/database/src/data-boundaries.ts` in this pass.

## DR2: UI labels vs Medusa module registration
- **Risk:** Admin shows provider toggle but Medusa `medusa-config` does not register module.
- **Detection:** Compare admin connection `provider` values to Medusa plugin list manually.

## DR3: Git status ahead of origin
- **Observation:** Repo is hundreds of commits ahead; local audit may not match deployed `main`.
- **Action:** Freeze a commit SHA when using this report for release.

## DR4: Schema vs code for new tables
- **Risk:** New Supabase migrations not applied in staging while code expects columns.
- **Action:** Run `pnpm check:migration-boundary` and migration scripts in CI.

## DR5: Storefront `next.config` and `instrumentation`
- **Risk:** Observability toggles differ between apps; on-call playbooks may reference wrong endpoints.

## DR6: Documentation in `internal/docs` vs runtime
- **Risk:** Exclusive schema dumps are snapshots; production evolves.
- **Action:** Regenerate or label snapshot dates on schema artifacts.

## DR7: ESLint config vs Next 15 expectations
- **Risk:** Rules differ from default Next template; developers get inconsistent local vs CI behavior.
