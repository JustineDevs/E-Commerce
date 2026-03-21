# SOP implementation plan: single source of truth (Medusa)

**Document purpose:** Executable plan so one system owns all live commerce data and behavior. **Medusa** is that system: Medusa Postgres and Medusa APIs (Store, Admin, hooks, subscribers).

**Related:** `internal/docs/adr/0001-medusa-system-of-record.md`, `internal/docs/MEDUSA-MIGRATION-PROGRAM.md`, `internal/docs/migration/field-mapping.md`, `internal/docs/runbooks/cutover.md`, `internal/docs/runbooks/rollback.md`, `internal/docs/SOP-OPERATIONS-MEDUSA.md`.

---

## 1. Non-negotiable rules

| Rule | Statement |
|------|------------|
| **SOR** | Medusa DB is the only live database for products, variants, carts, checkout, orders, payments (as modeled in Medusa), customers (buyers), inventory levels, fulfillments, and Medusa Admin users. |
| **No dual write** | The same order, stock movement, or customer profile must not be written to legacy Supabase and Medusa for ongoing operations. |
| **Legacy** | Legacy Express + `packages/database` + legacy schema are migration or archive only, then removed from the default path. |
| **Secrets** | `NEXT_PUBLIC_*` only for browser-safe values. Medusa secrets live in `apps/medusa/.env`. Root `.env` holds Next server secrets without `NEXT_PUBLIC_`. |

---

## 2. Scope: in vs out of Medusa SOR

| In Medusa SOR | Out of Medusa SOR (allowed only if documented) |
|---------------|--------------------------------------------------|
| Catalog, cart, checkout, orders, inventory, fulfillments, Store customers, Medusa Admin users | Static marketing site content, DNS, Lemon/AfterShip accounts (external), email provider account |
| Lemon and AfterShip integration logic for live commerce | One-off export jobs reading legacy DB until migration complete |

---

## 3. Phase A: Foundation (before any “Medusa-only” claim)

**Owner:** Engineering

1. **Medusa DB:** empty Postgres; set `DATABASE_URL` in `apps/medusa/.env` (Session pooler or direct per your Supabase policy).
2. Run Medusa migrations; confirm schema exists.
3. `pnpm seed:ph` (or documented prod seed): region PHP, sales channel Web PH, stock location, shipping, tax, publishable API key, CORS for storefront origin.
4. **Secrets:** `JWT_SECRET`, `COOKIE_SECRET` strong random; not placeholders in non-local deploys.
5. **Redis** URL valid for Medusa if required by your setup.

**Exit:** Medusa Admin loads; you can create one manual product in Admin.

---

## 4. Phase B: Data migration (one-time)

**Owner:** Backend

1. Export legacy catalog and inventory to JSONL (`export:catalog-for-medusa`, `export:inventory-for-medusa`) per `field-mapping.md`.
2. Run `import:legacy-catalog` then `import:legacy-inventory` against Medusa; reconcile counts.
3. Freeze new merchandising writes on legacy once import is the path of record for bulk load.

**Exit:** Staging SKU and stock parity within agreed tolerance.

---

## 5. Phase C: Identity (single customer and staff model)

**Owner:** Engineering + Product

1. **Buyers:** New signups and order history must resolve to Medusa Customer in Medusa DB. Google OAuth in Next.js must link to Medusa Customer (create or update via Store API or Medusa auth flow). Do not create ongoing reliance on legacy users for new buyers.
2. **Staff:** Medusa Admin invites for operations. Custom Next admin, if kept, must call only Medusa Admin API with server credentials, not parallel staff tables in legacy.

**Exit:** Documented flow: login → Medusa Customer or Medusa User; no new long-lived identity in legacy.

---

## 6. Phase D: Storefront and APIs (single traffic path)

**Owner:** Engineering

1. Set `NEXT_PUBLIC_COMMERCE_SOURCE=medusa` in environments that use Medusa SOR.
2. Storefront uses Medusa Store API for catalog, cart, checkout, track per your implementation.
3. **Webhooks:** Lemon and AfterShip URLs point only to Medusa endpoints for live commerce.
4. **`LEGACY_COMMERCE_API_DISABLED`:** enable on Express only after webhooks are on Medusa and smoke tests pass.

**Exit:** Test order end-to-end on staging with no legacy commerce API in the path.

---

## 7. Phase E: Cutover and legacy retirement

**Owner:** Tech lead + DevOps

1. Follow `runbooks/cutover.md`: freeze legacy writes, final export if needed, traffic and env switch, validate G1–G5 from `MEDUSA-MIGRATION-PROGRAM.md`.
2. Remove or archive Express commerce routes, legacy-only env vars, and default use of `packages/database/supabase/seed.sql` for new devs.
3. Keep export scripts only while historical migration or audit needs them; then archive.
4. Legacy Supabase project: read-only or decommission per policy.

**Exit:** No new orders in legacy DB; `SOP-OPERATIONS-MEDUSA.md` updated to “Medusa only.”

---

## 8. Phase F: Ongoing operations (single SOR)

**Owner:** Ops + Owner

Use `SOP-OPERATIONS-MEDUSA.md`: catalog in Admin, inventory in Medusa, fulfillment and tracking in Medusa, monitoring webhooks and DB backups for Medusa only.

---

## 9. Verification checklist (definition of done)

- [ ] All live commerce reads and writes go through Medusa.
- [ ] Medusa DB is the only live commerce database.
- [ ] Customer and staff identity for the product ties to Medusa, not legacy users, for new activity.
- [ ] Lemon / AfterShip production webhooks hit Medusa.
- [ ] Legacy commerce code paths disabled or removed; env cleaned.
- [ ] No `NEXT_PUBLIC_*` secret leakage in repo or build output.

---

## 10. Rollback

If cutover fails, follow `internal/docs/runbooks/rollback.md`. Do not run dual write without a named owner and reconciliation process.

---

## 11. Review cadence

**Quarterly:** Confirm no new dependencies on legacy schema; confirm webhook URLs and env templates match production.
