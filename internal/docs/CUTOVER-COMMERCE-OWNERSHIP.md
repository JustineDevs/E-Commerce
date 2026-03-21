# Commerce ownership (Medusa as system of record)

## Single answer: who owns paid order state?

**Medusa** is the only system of truth for:

| Concern | Owner | Notes |
|--------|--------|--------|
| Product catalog | Medusa | Store API + Admin |
| Cart / checkout session | Medusa | Store API payment sessions |
| Payment authorization & paid state | Medusa | Payment module + webhooks into Medusa |
| Inventory deduction | Medusa | Stock locations / reservations per Medusa model |
| Fulfillment / shipment records (commerce) | Medusa | Fulfillment workflows + subscribers |

## Root app (monorepo) ownership

| Concern | Owner |
|---------|--------|
| End-user auth (NextAuth) | Root Next apps |
| Public UI, `NEXT_PUBLIC_*` config | Root storefront / admin |
| Legacy user DB (Supabase `users`, etc.) | Root + `LEGACY_DATABASE_URL` |
| Express BFF / internal API | `apps/api` — **not** commerce truth |
| Medusa client URLs / publishable keys | Root `.env` — pointers to Medusa only |

## Legacy Express commerce

When legacy commerce is **disabled** (see table below), Express commerce routes return **410** and must not accept new writes. No feature should write **both** Medusa order state and legacy Supabase order rows for the same checkout.

Implementation: `apps/api/src/lib/legacyCommerceEnv.ts` — in **production**, both flags behave as **on (disabled)** when unset, so cutover cannot regress by omission. In **development**, unset means legacy remains available unless you set `=true`.

## Feature flags

| Variable | `true` / `1` | `false` / `0` | Unset |
|----------|--------------|---------------|--------|
| `LEGACY_COMMERCE_API_DISABLED` | Legacy commerce routes **off** (410) | Legacy commerce routes **mounted** | **Production:** off (410). **Dev:** mounted |
| `LEGACY_EXPRESS_WEBHOOKS_DISABLED` | Express Lemon/AfterShip webhooks **off** (410) | Webhooks **mounted** | **Production:** off (410). **Dev:** mounted |

## Related

- `COMMERCE-CUTOVER-PROGRAM.md` — 7-PR delivery sequence  
- `WEBHOOK-CUTOVER-CHECKLIST.md` — single-owner webhook URLs  
