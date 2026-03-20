# Runbook: Medusa cutover (strangler completion)

## Preconditions

- Staging **Medusa-only** path verified: catalog read, cart/checkout (when wired), webhook idempotency, fulfillment + tracking.
- `internal/docs/migration/field-mapping.md` signed off for price interpretation (`LEGACY_PRICE_ALREADY_MINOR` vs default).
- Legacy **open orders** counted; policy for in-flight checkout agreed (complete on legacy vs manual migration).

## Freeze

1. Stop **new** merchandising writes on legacy (or flag `LEGACY_WRITES=false` on API) at **T0**.
2. Final **`export:catalog-for-medusa`** + **`export:inventory-for-medusa`** snapshot; store artifact with timestamp.
3. Run **`import:legacy-catalog`** + **`import:legacy-inventory`** against **staging** Medusa; reconcile counts.
4. Repeat **import** on **production** Medusa after DB backup.

## Traffic switch

1. Point **storefront** `NEXT_PUBLIC_MEDUSA_*` / BFF to Medusa **publishable** key + URL.
2. Point **webhooks** (Lemon, AfterShip) to Medusa routes **only** (disable legacy Express endpoints or return **410**).
3. Verify **G1–G5** gates in `MEDUSA-MIGRATION-PROGRAM.md` for the environment.

## Validation (first 2 hours)

- Place **test order** → payment → fulfillment → **track** page.
- Monitor webhook DLQ / logs for duplicate events (idempotency).
- Dashboard: **no** new rows in legacy `orders` for storefront channel.

## Rollback

- If **P1** incident: execute `internal/docs/runbooks/rollback.md`.
- If **partial**: DNS/API flag back to legacy **read paths** only; **do not** dual-write orders without a reconciliation owner.
