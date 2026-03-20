# Dogfood Report: Apparel Commerce (Maharlika storefront + admin + API)

| Field | Value |
|-------|-------|
| **Date** | 2026-03-20 |
| **Method** | `turbo build` (storefront, admin, api), HTTP route matrix (`next start`, API optional), Playwright smoke, static UX review (`design-with-taste`), code path review for SSR failures |
| **Session** | `apparel-commerce-dogfood-2026-03-20` |
| **Skills** | `dogfood` (vercel-labs/agent-browser), `design-with-taste` (Family Values / gradual revelation + fluidity) |

---

## Summary

| Severity | Open | Closed this release |
|----------|------|---------------------|
| Critical | 0 | — |
| High | 0 | **ISSUE-001** |
| Medium | 0 | **ISSUE-002**, **ISSUE-003**, **ISSUE-006** |
| Low | 1 (**ISSUE-008** dev hygiene) | **ISSUE-004**, **ISSUE-005**, **ISSUE-007** |

**ISSUE-009** (`/health` 503 when DB down): expected for probes — not a product defect.

**Fixed in code (additional pass):** shop **filters + sort** (`shop-url`, `ShopSortSelect`, API `productListQuerySchema`); **live category counts** (`GET /products/categories/summary`); **`/collections`** vs duplicate nav; **policy routes** `/shipping`, `/returns`, `/terms`; footer **real links** + optional **`NEXT_PUBLIC_INSTAGRAM_URL`**; **Maharlika** home hero; **`CatalogProductCard`** (hover image rotate + sizes tooltip) on shop + home; admin BFF allows **`payments`**; POS **Generate Payment Link** → `POST /payments/pos-checkout`; PDP **size guide** + policy links; **`next.config` `images.remotePatterns`** from **`NEXT_PUBLIC_IMAGE_HOSTNAMES`** (default Supabase).

---

## Route inventory — Storefront (`apps/storefront`)

| Route | Build | Notes |
|-------|-------|--------|
| `/` | ƒ dynamic | Home; catalog call tolerant of API down (see fix below) |
| `/shop` | ƒ dynamic | Empty state “No products yet.” when API unavailable / empty |
| `/shop/[slug]` | ƒ dynamic | **`notFound()` → 404** when missing or API unreachable |
| `/checkout` | ○ static client | Primary pay CTA `checkout-submit-pay` |
| `/track` | ƒ | GET form → redirect `/track/[orderId]` |
| `/track/[orderId]` | ƒ | `try/catch` → “Order not found” if API/ network fails |
| `/account` | ƒ | Placeholder + sign-in link |
| `/collections` | ƒ | Category entry points → filtered `/shop` |
| `/shipping` | ○ | J&amp;T / Cavite pickup context |
| `/returns` | ○ | Policy from `Exchange Policy Details.md` |
| `/terms` | ○ | Short storefront terms |
| `/api/auth/[...nextauth]` | ƒ | OAuth surface |

**Next.js `_not-found`**: Custom `(public)/not-found.tsx` keeps **nav + footer** for 404s inside the public shell.

---

## Route inventory — Admin (`apps/admin`, port 3001)

| Route | Build | Notes |
|-------|-------|--------|
| `/admin` | ○ | Dashboard shell |
| `/admin/inventory` | ƒ | Requires session + BFF → not probed anonymously |
| `/admin/orders` | ƒ | Same |
| `/admin/pos` | ○ | Client POS |
| `/api/auth/[...nextauth]` | ƒ | |
| `/api/backend/[...path]` | ƒ | BFF to Node API |

**Dogfood gap:** Full admin pass needs **signed-in staff** session (Google) — run manually or with saved `agent-browser` auth state.

---

## API surface (`apps/api`, port 4000)

| Method | Path | Typical result when unauthenticated / misconfigured |
|--------|------|------------------------------------------------------|
| GET | `/health` | **503** if `DATABASE_URL`/Supabase fails (degraded) — expected |
| GET | `/products`, `/products/:slug` | 200 JSON when DB OK |
| POST | `/checkout` | 400/503 without body or LS env |
| GET | `/orders`, `/inventory`, `/shipments/*`, `/compliance/*` | **401** without `X-Internal-Api-Key` / configured header |
| POST | `/webhooks/*` | **401/503** without signature or secret |
| POST | `/payments/pos-checkout` | **201** + `{ checkoutUrl, orderId, orderNumber }` with internal API key + Lemon env; **503** if payments disabled |

---

## Automated / build signals

- **`pnpm exec turbo build`** for `@apparel-commerce/storefront`, `admin`, `api`: **PASS** (2026-03-20 run).
- **Playwright** with `PLAYWRIGHT_SKIP_WEBSERVER=1` while storefront returned **500** (API down + SSR `fetch` throwing): **2 failed** (home/shop), checkout **passed** — consistent with pre-fix behaviour.
- **Production check:** After `rm -rf apps/storefront/.next && pnpm build`, `next start -p 3020` with **no API**: **`/` and `/shop` → 200**, empty catalog UI — confirms catalog SSR hardening.

---

## Design-with-taste checklist (public storefront)

| Pillar | Assessment |
|--------|----------------|
| **Simplicity** | Checkout: single primary pay action — **good**. Shop page: sidebar filters + sort UI **do not appear wired** — reads as noise vs “one room at a time” (**see ISSUE-006**). Nav: **Shop** and **Collections** both go to `/shop` — duplicates intent (**ISSUE-004**). |
| **Fluidity** | Nav/footer use `transition-opacity` / hover states; `motion-surface` on checkout — **good**. No full “tray” patterns; acceptable for MVP. |
| **Delight** | PDP colour/size before add — **good**. Hero/shop copy still **“ARCHITECTURAL / Architectures”** while brand chrome is **Maharlika** — emotional mismatch (**ISSUE-005**). |

---

## Agent-browser (optional follow-up)

```bash
mkdir -p dogfood-output/screenshots dogfood-output/videos
agent-browser --session apparel-commerce-dogfood open http://localhost:3000
agent-browser --session apparel-commerce-dogfood wait --load networkidle
agent-browser --session apparel-commerce-dogfood snapshot -i
agent-browser --session apparel-commerce-dogfood screenshot --annotate dogfood-output/screenshots/home.png
agent-browser --session apparel-commerce-dogfood console
```

Use **`agent-browser` binary directly** (not `npx`) per skill. Capture **videos** only for interactive bugs (checkout pay, POS commit).

---

## Issues

### ISSUE-001 — ~~HIGH~~ **FIXED** — SSR 500 when API unreachable (storefront home/shop/PDP)

- **Symptom:** `fetch()` to `API_URL` throws on connection errors; `/` and `/shop` returned **500** so nav never rendered; Playwright `nav-home` missing.
- **Fix:** `apps/storefront/src/lib/catalog-fetch.ts` — central **try/catch**, empty list / `null` product instead of throw. Track page already had try/catch.
- **Verify:** Build + `next start` with API stopped → `/` and `/shop` return **200**.

### ISSUE-002 — ~~MEDIUM~~ **FIXED** — Missing PDP slug returned HTTP 200

- **Symptom:** Unknown slug showed in-page “Product not found” with **200 OK** (bad for SEO/crawlers).
- **Fix:** `notFound()` in `shop/[slug]/page.tsx` + `(public)/not-found.tsx` for branded 404 with nav/footer.
- **Repro video:** N/A (static HTTP semantics).

### ISSUE-003 — ~~MEDIUM~~ **FIXED** — Shop sidebar category counts

- **Fix:** `GET /products/categories/summary` + `fetchCategorySummaries`; shop “All” total + per-category counts from API.

### ISSUE-004 — ~~LOW~~ **FIXED** — Duplicate nav (Shop vs Collections)

- **Fix:** **Collections** → `/collections` (featured Shorts / Shirt / Jacket → filtered `/shop`).

### ISSUE-005 — ~~LOW~~ **FIXED** — Marketing voice vs Maharlika

- **Fix:** Home hero and newsletter block updated for **Maharlika Grand Custom** / Maharlika Apparel Custom.

### ISSUE-006 — ~~MEDIUM~~ **FIXED** — Filter / sort wiring

- **Fix:** Facet links + `ShopSortSelect` (client) + `shopHref` query building; API validates query via Zod.

### ISSUE-007 — ~~LOW~~ **FIXED** — Footer dead anchors

- **Fix:** `/shipping`, `/returns`, `/terms`, `/#join-club`; Instagram only if **`NEXT_PUBLIC_INSTAGRAM_URL`** is set.

### ISSUE-008 — LOW — Stale `.next` → `MODULE_NOT_FOUND` / ENOENT vendor chunks

- **Symptom:** Intermittent **`Cannot find module './872.js'`** on `next start` or dev after dependency/clean mismatch.
- **Mitigation:** `rm -rf apps/storefront/.next` (and siblings if needed) → `pnpm build`; avoid parallel devs on same `.next`.
- **Repro video:** N/A.

### ISSUE-009 — MEDIUM — `/health` 503 when database unavailable

- **Evidence:** By design `health` probes Supabase — returns **503** + `db: unavailable`.
- **Action:** Use for load balancers / k8s; do not treat as app bug — document in runbooks.
- **Repro:** Stop DB → `curl localhost:4000/health`.
- **Repro video:** N/A.

---

## Follow-up checklist

- [ ] Run **agent-browser** signed-in **admin** sweep (`/admin/*`, POS barcode, payment link with Lemon env).
- [ ] Set **`NEXT_PUBLIC_INSTAGRAM_URL`** (full URL or handle) for footer Instagram.
- [ ] Set **`NEXT_PUBLIC_IMAGE_HOSTNAMES`** if product images are not on default Supabase host pattern.
- [ ] Re-run **`pnpm test:e2e`** with API + storefront webServer for full green.
