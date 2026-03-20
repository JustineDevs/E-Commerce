# Medusa migration program (repo execution map)

Strangler migration for **`apparel-commerce/`**: Medusa becomes **system of record** for catalog, cart, checkout, customers, orders, inventory locations, fulfillments. **No long-term dual write path** for the same order or stock movement.

**Signed decision:** `internal/docs/adr/0001-medusa-system-of-record.md`  
**Field mapping:** `internal/docs/migration/field-mapping.md`  
**Cutover / rollback:** `internal/docs/runbooks/cutover.md`, `internal/docs/runbooks/rollback.md`

---

## Phase outline (0–7) vs repo

| Phase | Goal | Repo deliverables | Exit criterion |
|-------|------|-------------------|----------------|
| **0 — Program setup** | ADR, Node LTS, DB, CI | ADR; `apps/medusa` on Medusa **2.13.x**; `pnpm exec turbo build` includes **medusa**; `.env.template` documents DB isolation | Medusa boots locally; CI green |
| **1 — Foundation** | Region PHP, tax, channel, stock, shipping, keys | `pnpm seed:ph` → **Web PH**, **Philippines** / `php`, **Warehouse PH** + `legacy_inventory_location_code`, flat **Standard PH**, tax `ph`, publishable key | Admin login; manual **one product + options** possible |
| **2 — Catalog migration** | Legacy → Medusa products | `pnpm --filter @apparel-commerce/database run export:catalog-for-medusa -- file.jsonl`; `MIGRATION_CATALOG_JSONL=... pnpm import:legacy-catalog` (idempotent by **handle**) | Staging SKU parity smoke (see **G1**) |
| **3 — Inventory migration** | Opening levels per location | `export:inventory-for-medusa`; `MIGRATION_INVENTORY_JSONL=... pnpm import:legacy-inventory` | Totals within tolerance vs legacy export |
| **4 — Payments** | Lemon on Medusa | Custom or community **payment provider** + webhook + idempotency store (mirror `apps/api` HMAC rules) | Test: cart → pay → **completed** order |
| **5 — Fulfillment** | AfterShip / J&T | Subscribers on fulfillment; tracking written on order/fulfillment for **track** UX | Test AWB visible on customer track path |
| **6 — Storefront** | Medusa Store API only | `apps/storefront`: PDP, cart, checkout, account, track → Medusa; retire Express for that traffic | E2E on staging |
| **7 — Admin / POS** | Single OMS | Medusa Admin **or** `apps/admin` calling **only** Medusa Admin API; draft orders for POS | No new legacy **`orders`** inserts for ops sales |

**Later (program doc alignment):** Phase **8–9** in-repo map = **cutover flag + decommission** (`runbooks/cutover.md`, Express route archive).

---

## Monorepo map (target)

| Layer | Today | Target |
|-------|--------|--------|
| Commerce DB | Legacy Postgres (Supabase) + `packages/database` | **Medusa migrations** on dedicated Postgres |
| Catalog | Express `GET /products`, seeds | Medusa **Admin** + **Store API** |
| Cart | Browser storage | Medusa **cart** |
| Checkout | `POST /checkout` → Lemon | Medusa **payment session** + provider |
| Admin | Custom Next admin | Medusa Admin + optional thin UI |
| Webhooks | Express | Medusa **subscribers**; single idempotency |

---

## Quality gates

| Gate | Requirement |
|------|----------------|
| **G1** | Staging: representative SKU import (e.g. 50), random **10 PDP** spot-checks, cart merge sanity, one checkout path |
| **G2** | Webhook replay: same **event id** twice → one side effect |
| **G3** | Store API catalog pagination under expected load (baseline benchmark) |
| **G4** | **No secret keys** in storefront bundle; **CORS** matches deployment origins |
| **G5** | Rate limits / gateway for brute-force on public Medusa routes per ops policy |

---

## Definition of done (migration)

1. **New** orders exist **only** in Medusa DB.  
2. **Storefront** uses **only** Medusa **Store API** for commerce paths.  
3. **Lemon** payment confirmation runs through Medusa payment flow + webhooks.  
4. **Fulfillment + AfterShip** update Medusa fulfillments (not only legacy `shipments`).  
5. **Staff** daily ops from Medusa Admin **or** UI with **zero** legacy commerce writes.

---

## Risks (living list)

| Risk | Mitigation |
|------|------------|
| Open orders at cutover | Low-traffic window; script + QA for stragglers |
| Lemon provider gaps | Custom provider mirroring current HMAC + event store |
| Dual writes during migration | Feature flags + **write-volume** alerts per DB |
| Price mis-map (major vs minor) | `field-mapping.md` + `LEGACY_PRICE_ALREADY_MINOR`; spot-check basket totals |

---

## Environment (Medusa)

Dedicated **`DATABASE_URL`** in `apps/medusa/.env` / `.env.template` — **not** the same schema as legacy Supabase used by **`packages/database`**.

## CI

- `pnpm exec turbo build` (includes **medusa**).
- Optional: `cd apps/medusa && pnpm run test:unit` when DB harness is wired.

## Related

- Architecture: `ARCHITECTURE-DELIVERABLE.md`
