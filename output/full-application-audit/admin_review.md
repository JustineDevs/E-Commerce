# Admin review

## Dashboard

- Aggregates analytics from bridges; wrong SQL or Medusa admin API usage yields confident wrong KPIs. **FRAGILE**.

## Products and catalog

- New catalog UI in git status under `admin/catalog`; ensure Medusa remains SoR and admin BFF does not write shadow product tables in Supabase.

## Inventory

- Medusa inventory vs any Supabase mirror: verify no duplicate stock decrements.

## Orders and fulfillment

- Refund route `orders/[orderId]/refund` touches money; idempotency and permission checks are **CRITICAL**.

## POS

- `commit-sale`, lookup, suggestions: race on double tap; offline queue replay must not double charge.

## Customers and CRM

- CRM views may join Medusa customer ids; do not edit Medusa core tables from Supabase directly.

## Payments and settings

- Payment connections manager is the BYOK control plane; operators need clear "Medusa will restart or env reload" messaging if behavior requires it (today: Medusa reads at boot).

## CMS and commerce interactions

- Commerce CMS blocks that reference product ids must validate ids exist or show broken tile handling.

## Admin UX clarity

- Many side nav entries; permission-denied should be explicit, not empty screens.

## Permission safety

- Middleware role check is coarse; per-route checks must enforce fine grants. **UNKNOWN** coverage for every new API in git diff.

## Operator failure modes

- Disabling a connection in UI while Medusa still has old env until restart: **caveat** for platform mode.
- Test payment hitting real PSP if mode wrong: **dangerous**; verify sandbox guards.

## Misleading controls

- Buttons that trigger async Medusa jobs without progress or job id feel instant; add status polling or toast persistence.
