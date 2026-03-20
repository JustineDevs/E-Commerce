# Runbook: rollback from Medusa cutover

## When to use

- Critical payment or inventory corruption on Medusa path.
- Webhook or fulfillment pipeline **cannot** complete orders safely within agreed SLA.

## Immediate actions

1. **Traffic:** Point storefront and admin BFF to **legacy API** (`apps/api`) via env/DNS/feature flag **documented at cutover**.
2. **Webhooks:** Re-enable legacy Lemon/AfterShip URLs in provider dashboards (or load balancer rules).
3. **Writes:** Confirm **legacy** `POST /checkout` and order creation enabled for customer channel.
4. **Comms:** Freeze Medusa **admin** product edits that would diverge from legacy (or export Medusa catalog snapshot first).

## Data

- Medusa DB: leave **running** for forensics; mark **read-only** if team policy requires (instance-level or revoke app role).
- Legacy DB: restore from **pre-cutover backup** only if legacy was mutated incorrectly during cutover; otherwise forward-fix.

## Post-incident

- Root-cause: webhook duplicate, region/pricing mismatch, inventory level drift, etc.
- Re-run **`import:legacy-inventory`** after fix only if SKU/location mapping is correct (`field-mapping.md`).
- Update `MEDUSA-MIGRATION-PROGRAM.md` risks table with new mitigation.
