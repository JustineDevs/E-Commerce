# SOP: Medusa-only commerce, env hygiene, and legacy retirement

**Audience:** Engineering and tech lead  
**Goal:** One source of truth (**Medusa DB + Medusa APIs**) for catalog, cart, checkout, orders, customers, inventory, fulfillments. **No** parallel legacy commerce after cutover. **Development** follows the same rules as production (secrets, separation, no dual write).

---

## SOP-0: Definitions

| Term | Meaning |
|------|--------|
| **Medusa SOR** | All live commerce data and mutations go through **Medusa** only. |
| **`NEXT_PUBLIC_*`** | Loaded in the **browser**. Must not contain secrets. |
| **Server-only env** | API keys, DB URLs, webhook secrets, JWT secrets. **Never** prefix with `NEXT_PUBLIC_`. |
| **Legacy** | Express `apps/api` + `packages/database` + legacy Supabase schema. **Retire** after cutover. |

---

## SOP-1: Environment file layout (mandatory)

**1.1 `apparel-commerce/.env.example` (single source of truth — monorepo root)**

- Canonical list for **Express API**, **legacy DB**, **storefront/admin Next** env, and **shared secret names** also used by Medusa (Lemon, Resend, AfterShip): document each key **once** here.
- **`NEXT_PUBLIC_*`:** only values safe to expose. **Server-only:** no `NEXT_PUBLIC_` for secrets.
- **Do not** duplicate Medusa-only server keys here (Medusa CORS/JWT, Medusa `DATABASE_URL`, Stripe/PayPal/Paymongo, migrations) — those live in **`apps/medusa/.env.template`**.

**1.2 `apparel-commerce/apps/medusa/.env.template` (single source of truth — Medusa process)**

- Canonical list for **Medusa server** only: CORS, JWT/COOKIE, Medusa Postgres `DATABASE_URL`, Redis, migration env, Stripe/PayPal/Paymongo/COD, `STOREFRONT_PUBLIC_URL`, etc.
- For **Lemon / Resend / AfterShip**, copy **same variable names** from root `.env.example` into `apps/medusa/.env` — **do not** maintain duplicate long descriptions in the Medusa template.

**1.3 `apparel-commerce/apps/medusa/.env` and `apparel-commerce/.env`**

- **Generate** `JWT_SECRET` and `COOKIE_SECRET` with `openssl rand -base64 32` (distinct values) for anything beyond local solo dev.
- **Never** commit real `.env` files; update **only** the two templates in **1.1** / **1.2** when variables change.

**Verification:** Run `pnpm verify:public-env` from `apparel-commerce/` (checks committed templates). Additionally grep the repo for `NEXT_PUBLIC_` and confirm no secret patterns (long random keys, `sk_`, `service_role`, webhook secrets) appear on `NEXT_PUBLIC_` lines in app source or env files you ship.

---

## SOP-2: Database separation

**2.1** Medusa uses **its own** Postgres (`DATABASE_URL` in `apps/medusa/.env`). Run **Medusa migrations** on that DB before seed or imports.

**2.2** Legacy Supabase schema (`packages/database/supabase/seed.sql`) is **not** Medusa. Use it **only** while legacy exists or for **export-to-Medusa** migration.

**2.3** After cutover, **stop** applying legacy seed to new environments unless you keep a dedicated **migration archive** project.

---

## SOP-3: Commerce routing (single path)

**3.1** In every non-production and production storefront config: **`NEXT_PUBLIC_COMMERCE_SOURCE=medusa`** when Medusa is the SOR.

**3.2** **Do not** add new features to legacy Express commerce routes. **Do not** run dual write (same order in legacy and Medusa).

**3.3** When Medusa is verified: set **`LEGACY_COMMERCE_API_DISABLED=true`** on Express **only after** Lemon and AfterShip webhooks target **Medusa** (otherwise you return 410 to the wrong endpoint).

---

## SOP-4: Payments and webhooks

**4.1** **Lemon Squeezy:** webhook URL in the Lemon dashboard points to **Medusa** payment hook path. Test **paid** → order completed in **Medusa Admin**.

**4.2** **AfterShip:** webhook URL points to **Medusa** route used by your integration. Confirm fulfillment metadata updates.

**4.3** Remove or disable **duplicate** Lemon/AfterShip handlers on Express when Medusa is authoritative.

**Implementation (Express `apps/api`):** set **`LEGACY_EXPRESS_WEBHOOKS_DISABLED=true`** so `POST /webhooks/lemonsqueezy` and `POST /webhooks/aftership` return **410** with `code: LEGACY_EXPRESS_WEBHOOKS_GONE` (see `legacyCommerceGate.ts`). Enable only after Lemon/AfterShip dashboards target **Medusa**. **`LEGACY_COMMERCE_API_DISABLED=true`** also disables those routes (and all other legacy commerce paths). **`GET /health/commerce`** exposes `legacyExpressWebhooksDisabled`.

---

## SOP-5: Legacy deletion (after cutover)

**5.1 Preconditions**

- Staging **Medusa-only** smoke: catalog, cart, checkout, order, fulfillment, track.
- No open business requirement for legacy-only behavior, or it is captured as a **small** non-commerce service.

**5.2 Actions**

- Remove or archive **Express commerce routes** and **packages/database** queries used only by legacy storefront checkout.
- Remove **legacy** env vars from root `.env.example` and deployment secrets.
- Archive **`seed.sql` / legacy migrations** or move to `archive/` with a README “migration only.”
- Update **`SOP-OPERATIONS-MEDUSA.md`** and **`MEDUSA-MIGRATION-PROGRAM.md`** to state **legacy commerce removed.**

**5.3 Keep only if proven**

- One-off scripts that **read** old DB for audit export.
- Non-commerce micro-routes (only if you still need them and Medusa cannot replace them yet).

---

## SOP-6: Production-level discipline in development

**6.1** Same **secret** rules as prod: no `NEXT_PUBLIC_` secrets, rotate dev secrets if leaked.

**6.2** **CI:** `turbo build` includes **storefront** and **medusa**; from monorepo root run **`pnpm ci:check`** (`verify:public-env` + `turbo build`). Optional `tsc --noEmit` on PRs per app.

**6.3** **Backups:** even for dev Medusa DB if it holds non-trivial work; document restore for staging (see **`apps/medusa/README.md`** § Database backup and restore).

---

## SOP-7: Quick checklist (before any release candidate)

- [ ] Medusa migrations applied; `seed:ph` or prod seed done as required.  
- [ ] Root `.env`: `NEXT_PUBLIC_*` only public; server secrets without `NEXT_PUBLIC_`.  
- [ ] `apps/medusa/.env`: full Medusa backend config; strong JWT/cookie secrets outside local throwaway.  
- [ ] `COMMERCE_SOURCE=medusa` for the storefront under test.  
- [ ] Webhooks point to Medusa; test payment and tracking.  
- [ ] Legacy commerce disabled or removed per scope; no dual SOR.
