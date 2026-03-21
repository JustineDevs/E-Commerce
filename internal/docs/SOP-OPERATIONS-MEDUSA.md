# Standard operating procedures (SOP): Apparel Commerce (Medusa single source of truth)

**Purpose:** Repeatable steps for daily operations so **one commerce engine (Medusa)** stays the only live source of truth for catalog, cart, checkout, orders, inventory, and fulfillment. **Production storefront** uses **`NEXT_PUBLIC_COMMERCE_SOURCE=medusa`**. Legacy Express commerce is **off** in production (`LEGACY_COMMERCE_API_DISABLED`).

**Scope:** Product setup, web sales, in-store (POS), fulfillment, tracking, access, and health checks. Exception flows (COD/OTP) add sub-steps when you enable them.

**Roles:**

| Role | Access |
|------|--------|
| **Owner** | Medusa Admin (full), billing accounts (Lemon, hosting), DNS |
| **Ops / fulfillment** | Medusa Admin orders + fulfillments, stock adjustments as policy allows |
| **Store staff (POS)** | Medusa draft-order / POS workflow (or designated UI), no infra keys |
| **Support** | Medusa order lookup, customer comms; no production DB credentials |
| **Engineering** | Deployments, env vars, webhooks, migrations |

---

## SOP-0: Preconditions (once per environment)

**Owner / Engineering**

1. Medusa **migrations** applied; **`seed:ph`** (or equivalent) run for **Philippines**, **Web PH**, **Warehouse PH**, shipping + tax + publishable key (see `apps/medusa/README.md`).
2. **Storefront** env: `NEXT_PUBLIC_COMMERCE_SOURCE=medusa`, `NEXT_PUBLIC_MEDUSA_URL`, publishable key, `NEXT_PUBLIC_MEDUSA_REGION_ID`, payment provider id.
3. **Lemon Squeezy** test and live webhooks point to **Medusa** URLs only.
4. **AfterShip** webhook points to **Medusa** only.
5. Express **`LEGACY_COMMERCE_API_DISABLED=true`** only **after** webhooks are on Medusa and smoke test passed.
6. **CORS** on Medusa allows the real storefront origin.
7. **Backups** scheduled for **Medusa** database.

**Check:** Place one **test order** end-to-end; payment completes; order shows **completed**; fulfillment test does not break webhooks.

---

## SOP-1: New product (catalog and images)

**Owner / Ops**

1. **Medusa Admin → Products → Create**
   - Title, **handle** (URL slug, stable), description, status (draft until ready).
2. **Options:** e.g. **Size**, **Color** (consistent naming across catalog).
3. **Variants:** SKU unique, barcode if used, prices in **PHP** (minor units correct in Admin).
4. **Images:** upload or paste **HTTPS** URLs (e.g. Supabase Storage public URL). Order images for PDP gallery.
5. **Inventory:** set levels at **Warehouse PH** (and other locations if used).
6. **Collections / categories** as needed; assign sales channel **Web PH**.
7. **Publish** product when stock and copy are final.

**Quality gate:** Open **storefront PDP**; image loads; variant select works; **out-of-stock** behavior matches policy.

**Do not:** maintain a second catalog only in legacy Postgres for live SKUs.

---

## SOP-2: Replenish or adjust stock

**Ops**

1. **Medusa Admin → Inventory** (or product → inventory) for the **stock location**.
2. Perform **adjustment** with reason per policy (receive, count correction, damage).
3. **Do not** edit totals without an audit trail that Medusa records (use Admin flows, not raw SQL).

**Quality gate:** Storefront or Admin shows expected **available** quantity; no negative unless policy allows backorder.

---

## SOP-3: Web order (customer path)

**Customer**

1. Browse shop; add to cart; **checkout** (Lemon hosted as configured in Medusa).
2. Complete payment on Lemon; return to site if UX provides a link.
3. Use **tracking link** from email or account (`/track/cart_*` until order exists, then `/track/order_*` per your storefront rules).

**Support**

1. Find order in **Medusa Admin** by **display id** or customer email.
2. Confirm **payment status** and **fulfillment status** before promising ship dates.

**Do not:** mark paid manually unless **documented exception** (e.g. COD when implemented).

---

## SOP-4: In-store sale (POS)

**Store staff**

1. Open **Medusa** POS / draft-order flow (per your finalized UI: Medusa Admin or custom client on **Medusa APIs only**).
2. Add line items by **SKU** or variant; confirm totals with customer.
3. **Payment:** Lemon link on device **or** policy-approved cash path if you implement it in Medusa (no parallel **legacy Express** `POST /orders` in production).
4. **Receipt:** provide order **display id** and support contact.

**Quality gate:** Order exists **only** in Medusa; inventory decrements per Medusa rules.

---

## SOP-5: Fulfillment and shipping (J&T / AfterShip)

**Ops**

1. **Medusa Admin:** open **paid** (or ready-to-pack) order.
2. Create **fulfillment**; enter or generate **tracking** per carrier workflow.
3. Confirm **AfterShip** tracking exists if automation creates it; else create tracking in carrier tools and ensure Medusa **fulfillment labels/metadata** match (per your integration).
4. Mark shipped when pickup is confirmed; monitor **AfterShip** status until **delivered** (or exception).

**Support:** Customer **track** page reads **Medusa** fulfillment / metadata (no legacy Express track in prod).

**Exception:** Failed delivery, return to sender: log in Admin notes; follow **returns** SOP when module enabled.

---

## SOP-6: Daily health (5 to 10 minutes)

**Owner or Engineering**

1. **Medusa** and **storefront** URLs respond; **Admin** login works. Automated probes (when deployed): storefront `GET /api/health/sop` (commerce source + Medusa `/health` + env completeness for `medusa` mode); Express API `GET /health/commerce` (legacy flag + optional Medusa backend reachability when `MEDUSA_BACKEND_URL` is set).
2. **Lemon:** no spike in failed webhooks (Medusa logs or provider dashboard).
3. **AfterShip:** recent shipments updating; no stuck **pending** beyond SLA.
4. **Orders** stuck in **pending payment** longer than threshold: cancel or contact (policy).
5. **Error budget:** review host metrics / logs for **5xx** on Medusa and storefront.

**Weekly:** verify **database backup** restore test per `privacy-terms` / ops policy.

---

## SOP-7: Client and stakeholder access

**Owner**

1. **Production Merchants:** **individual Medusa Admin** invites; roles least-privilege (fulfillment vs admin).
2. **Training / demos:** use **staging**, not production.
3. **Passive stakeholders:** reports or read-only dashboards; **no** shared Admin password.
4. **Offboarding:** deactivate Medusa users; rotate keys only if compromise suspected (see runbooks).

---

## SOP-8: Incident and rollback (pointer)

**Engineering**

1. **Payment or webhook outage:** follow `internal/docs/runbooks/cutover.md` / `rollback.md`; **do not** re-enable legacy dual-write without **reconciliation owner**.
2. **Wrong catalog data:** fix in **Medusa**; re-export storefront cache if applicable.
3. **Data loss suspicion:** stop writes; restore Medusa DB from backup; post-incident note.

---

## SOP-9: Definition of done (operational)

- Every live SKU exists **only** in **Medusa** with correct **inventory** and **images**.
- Every live order is **created and completed** through **Medusa** (payments + fulfillments).
- **No** routine use of **legacy Express** commerce routes in production.
- Staff can run **SOP-1 through SOP-6** without developer help for standard cases.

---

## Trimming non-live flows

Omit or stub sections in this document when a capability is not live (for example COD/OTP, extra payment rails). Keep **SOP-0** and **SOP-9** aligned with what production actually enforces.

---

## Part II: Medusa-only commerce (development + production parity)

**Goal:** Even before public deploy, **all commerce behavior** is implemented and tested as **production-grade**: **one source of truth** in **Medusa** (DB + APIs). **Legacy** exists only until **cutover**, then is **removed** except **documented micro-exceptions** where Medusa cannot replace a capability yet.

**Applies to:** Engineering, ops, anyone changing catalog, checkout, orders, or inventory.

### II-1. Principles (non-negotiable)

| # | Rule |
|---|------|
| P1 | **Catalog, cart, checkout, orders, customers (commerce), inventory, fulfillments** live in **Medusa** only for **new** work. |
| P2 | **Local and staging** use the same **architectural** rules as production: **no** “dev-only” second checkout path unless it is **explicitly** flagged and **temporary**. |
| P3 | **Legacy Express + legacy Supabase schema** are **not** extended for new features. **Bugfixes** on legacy only if **cutover is blocked** and **ADR** notes the exception. |
| P4 | **Default `NEXT_PUBLIC_COMMERCE_SOURCE=medusa`** in dev/staging as soon as Medusa is bootable; **legacy** is opt-in for **migration testing only**. |
| P5 | **After cutover:** delete legacy commerce code paths; keep **only** listed **exceptions** in **II-8** with a **remove-by date**. |

### II-2. Roles (engineering parity)

| Role | Responsibility |
|------|----------------|
| **Tech lead** | Approves exceptions to P1–P5; signs cutover. |
| **Developer** | Implements Medusa-first; does not add legacy commerce features. |
| **QA / lead** | Verifies Medusa path before any “done” on commerce stories. |

### II-3. Environment setup (every developer machine)

**Owner: each developer**

1. **Medusa:** `apps/medusa/.env` from `.env.template`: valid **`DATABASE_URL`** (Medusa DB), **Redis**, **JWT_SECRET** / **COOKIE_SECRET** (not `supersecret` for shared staging), **CORS** for storefront origin.
2. **Run migrations** for Medusa; run **`seed:ph`** for PH baseline (region, channel, location, shipping, tax).
3. **Storefront** `apparel-commerce/.env`: **`NEXT_PUBLIC_COMMERCE_SOURCE=medusa`**, Medusa URL, publishable key, region id, payment provider id.
4. **Lemon / AfterShip** (test mode): point webhooks to **Medusa** URLs for local tunnel or staging; **never** configure both Medusa and legacy as live targets for the same event without a migration note.
5. **Legacy API:** do **not** start legacy as primary path; use only when testing **migration** or **parity**.

**Check:** One **test checkout** completes in Medusa Admin with **paid** / **completed** state.

### II-4. Daily development workflow

**Developer**

1. Pull latest; **pnpm install** if lockfile changed.
2. Start **Medusa** (`apps/medusa`), **storefront**, **Redis** as required.
3. **Do not** implement new commerce APIs in **`apps/api`** or new tables in **`packages/database`** for product/order/cart.
4. **Feature work:** Medusa module, subscriber, Store API usage, or Admin customization.
5. **If blocked:** open a **spike** or **ADR**; do **not** permanently fork the domain into legacy.

### II-5. Definition of “production-level” in dev

A story is **not done** until:

| Item | Check |
|------|--------|
| **Data** | Read/write goes through **Medusa** APIs or official Medusa workflows. |
| **Payments** | Lemon webhook hits **Medusa**; idempotency understood; test mode documented. |
| **Security** | No **secret** keys in storefront bundle; CORS correct for Medusa. |
| **Errors** | User-facing errors are safe; **no** stack traces to clients. |
| **Observability** | Logs sufficient to debug **order id** / **cart id** in Medusa. |

### II-6. Legacy usage (allowed only until cutover)

| Use case | Allowed? |
|----------|------------|
| **Export JSONL** for Medusa import (`export-legacy-catalog-for-medusa`, etc.) | **Yes** |
| **Migration / parity testing** | **Yes**, time-boxed |
| **New features** (new endpoints, new order flows) | **No** |
| **Production traffic** (when deployed) | **No** after cutover |

### II-7. Cutover SOP (dev → “legacy off” in repo)

**Tech lead + developer**

1. **Inventory** open issues: legacy-only dependencies (list in ticket).
2. **Set** `NEXT_PUBLIC_COMMERCE_SOURCE=medusa` in **`.env.example`** as default when Medusa is required for all devs (policy decision).
3. **Enable** `LEGACY_COMMERCE_API_DISABLED=true` in **local/staging** Express to prove **nothing** breaks.
4. **Remove** or **archive** Express routes: checkout, products, orders, inventory, payments, shipments, public orders, legacy webhooks.
5. **Delete** unused **`packages/database`** commerce paths or keep **only** export scripts until data no longer needed.
6. **Update** `internal/docs/adr/0001-*`, `MEDUSA-MIGRATION-PROGRAM.md`, this document (`SOP-OPERATIONS-MEDUSA.md`) with **cutover date** and **no dual write**.
7. **Tag** git release: `medusa-csor-cutover` or similar.

**Verification:** Grep for **`/checkout`** to Express from storefront; **zero** in prod path. **New** orders in Medusa only.

### II-8. Micro-exceptions (tiny legacy pieces)

*Not to be confused with **SOP-8: Incident and rollback** above.*

**Only if Medusa cannot replace yet** (must be **documented**):

| Field | Required |
|-------|----------|
| **What** | Exact file or service (e.g. “compliance export only”). |
| **Why** | Gap in Medusa or business rule. |
| **Remove-by** | Date or milestone. |
| **Owner** | Name. |

**Review:** Quarterly; **delete** exception when closed.

### II-9. Forbidden (without lead approval)

- New **legacy** `orders` / `inventory_movements` writers for storefront flows.
- **Two** active Lemon webhook processors for the same store.
- **`COMMERCE_SOURCE=legacy`** as default in **staging** once Medusa is stable.

### II-10. Quick reference

| I want to… | Do this |
|------------|---------|
| Add a product | **Medusa Admin** + Medusa DB |
| Change stock | **Medusa** inventory |
| Checkout | **Store** API + Medusa payment session |
| Fix a bug in checkout | **Medusa** module / storefront Medusa client, **not** Express `checkout` |
| Import from old DB | **JSONL** scripts → **Medusa** import; **do not** sync two systems forever |

---

*Part II matches the rule: **Medusa = single commerce engine**; **legacy = temporary migration surface**, then **delete** except **II-8** micro-exceptions.*
