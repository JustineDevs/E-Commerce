# Legacy Supabase → Medusa field mapping

Source export: `packages/database/scripts/export-legacy-catalog-for-medusa.ts` and `export-legacy-inventory-for-medusa.ts` (JSON Lines).

## Catalog JSONL (one object per line)

| Legacy path | Medusa target | Notes |
|-------------|---------------|--------|
| `product.slug` | `product.handle` | PDP URL key; import **skips** if handle already exists. |
| `product.name` | `product.title` | |
| `product.description` | `product.description` | |
| `product.status` | `product.status` | `draft` → `DRAFT`; else **PUBLISHED** (includes legacy `active`). |
| `product.category` | `product_category.name` → `category_ids[]` | Categories created on demand; first match by name wins. |
| `product.id` | `product.metadata.legacy_product_id` | Stable cutover correlation. |
| `product.brand` | `product.metadata.legacy_brand` | |
| `product.category` (string) | `product.metadata.legacy_category` | Duplicate of source for filters/reporting. |
| `images[].image_url` | `images[].url` | Sorted by `sort_order`. |
| `images[].sort_order` | (ordering only) | |
| `variants[].sku` | `variants[].sku` | |
| `variants[].barcode` | `variants[].barcode` | |
| `variants[].size` / `color` | `options` **Size** / **Color** | Option values unioned from **active** variants only. If neither dimension exists, single option **Variant** / `Default`. |
| `variants[].price` | `variants[].prices[]` `currency_code: php` | **Default:** legacy value treated as **PHP major units** → `amount = round(price * 100)` (minor). If your column is already minor units, set **`LEGACY_PRICE_ALREADY_MINOR=1`** on import. |
| `variants[].compare_at_price` | `variants[].metadata.legacy_compare_at_price_minor` | Same conversion rule as `price`. Not Medusa “compare-at” UI unless you add price lists later. |
| `variants[].id` | `variants[].metadata.legacy_variant_id` | Join key for inventory rows / order migration. |
| `variants[].is_active` | (filter) | Inactive variants omitted from import payload. |

**Sales channel:** defaults to **`Web PH`** (`MIGRATION_SALES_CHANNEL_NAME` overrides).  
**Shipping:** products get the current **default shipping profile** (`import:legacy-catalog`).

## Inventory JSONL (one object per line)

| Legacy path | Medusa target | Notes |
|-------------|---------------|--------|
| `location.code` | `stock_location.metadata.legacy_inventory_location_code` | **Primary** resolver; `seed:ph` sets default `WH1` via `MEDUSA_SEED_LEGACY_LOCATION_CODE`. |
| `location.name` | `stock_location.name` | Fallback match if metadata missing. |
| `sku` | `inventory_item.sku` | **Must** exist (run catalog import first). |
| `on_hand` | `inventory_level.stocked_quantity` | `floor`’d, minimum 0. Creates level or **updates** existing `(item, location)`. |
| `variant_id` | (not used by importer) | Preserved in export for reconciliation scripts / audits. |

## Post-import checks

- Spot-check **≤20 SKUs**: Admin vs legacy PDP (title, options, image order, price display in **php**).
- Compare **inventory** sums per location ± tolerance after a cut window (`internal/docs/runbooks/cutover.md`).
