import Image from "next/image";
import Link from "next/link";
import {
  AdminBreadcrumbs,
  AuditTimeline,
  CrudManagerLayout,
} from "@/components/admin-console";
import { AdminTechnicalDetails } from "@/components/AdminTechnicalDetails";
import {
  fetchMedusaProductsListForAdmin,
  getMedusaAdminProductEditUrl,
  getMedusaAdminProductsIndexUrl,
  type MedusaProductListRow,
} from "@/lib/medusa-catalog-bridge";
import {
  aggregateStockAvailableByProductId,
  fetchAllMedusaInventoryRows,
} from "@/lib/medusa-inventory-bridge";
import { requirePagePermission } from "@/lib/require-page-permission";
import { getStorefrontPublicOrigin } from "@/lib/storefront-public-url";

function formatAggregatedStock(
  p: MedusaProductListRow,
  stockByProduct: Map<string, number>,
): string {
  if (p.variantCount === 0) return "—";
  if (!stockByProduct.has(p.id)) return "—";
  return String(stockByProduct.get(p.id) ?? 0);
}

export const dynamic = "force-dynamic";

const CATALOG_FLASH_MESSAGES: Record<string, string> = {
  created: "Product created.",
  updated: "Changes saved.",
  deleted: "Product removed.",
};

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; flash?: string }>;
}) {
  await requirePagePermission("catalog:read");
  const { q, flash } = await searchParams;
  const query = q?.trim() ?? "";
  const flashKey = typeof flash === "string" ? flash.trim() : "";
  const flashText = flashKey ? (CATALOG_FLASH_MESSAGES[flashKey] ?? null) : null;
  const catalogDismissHref =
    query !== "" ? `/admin/catalog?q=${encodeURIComponent(query)}` : "/admin/catalog";
  const { products, count, commerceUnavailable } =
    await fetchMedusaProductsListForAdmin({ q: query, limit: 50 });

  const inventoryRows = commerceUnavailable
    ? []
    : await fetchAllMedusaInventoryRows({ batchSize: 100 });
  const stockByProduct = aggregateStockAvailableByProductId(inventoryRows);

  const shopOrigin = getStorefrontPublicOrigin();

  const fullEditorUrl = getMedusaAdminProductsIndexUrl();

  const commerceBanner = commerceUnavailable ? (
    <div className="rounded border border-outline-variant/30 bg-surface-container-high px-4 py-3 text-sm">
      <p className="font-medium text-primary">Store service unavailable</p>
      <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
        Wait until the commerce service has finished starting, then refresh. The list below needs
        that connection.
      </p>
    </div>
  ) : null;

  const flashBanner = flashText ? (
    <div className="rounded-lg border border-emerald-200/90 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-950 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="font-medium">{flashText}</p>
        <Link
          href={catalogDismissHref}
          className="shrink-0 text-xs font-semibold uppercase tracking-wide text-primary hover:underline"
        >
          Dismiss
        </Link>
      </div>
    </div>
  ) : null;

  const bannerSlot =
    commerceBanner || flashBanner ? (
      <div className="space-y-4">
        {commerceBanner}
        {flashBanner}
      </div>
    ) : null;

  const filters = (
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
      <p className="text-sm text-on-surface-variant">
        {commerceUnavailable ? "—" : `${count} product${count === 1 ? "" : "s"} found`}
      </p>
      <form action="/admin/catalog" method="get" className="flex w-full max-w-md gap-2">
        <input
          name="q"
          defaultValue={query}
          placeholder="Search by name or handle"
          className="flex-1 rounded-lg border border-outline-variant/30 bg-white px-3 py-2 text-sm"
          aria-label="Search products"
        />
        <button
          type="submit"
          className="rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-4 py-2 text-sm font-medium text-primary"
        >
          Search
        </button>
      </form>
    </div>
  );

  const actions = (
    <>
      <Link
        href="/admin"
        className="inline-flex items-center justify-center rounded-lg border border-outline-variant/30 bg-white px-5 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container-low"
      >
        Back to dashboard
      </Link>
      <Link
        href="/admin/catalog/new"
        className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95"
      >
        Add product
      </Link>
      <a
        href={fullEditorUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center rounded-lg border border-outline-variant/30 bg-white px-5 py-2.5 text-sm font-semibold text-primary hover:bg-surface-container-low"
      >
        Open full catalog in store admin
      </a>
    </>
  );

  return (
    <CrudManagerLayout
      title="Products"
      subtitle="Published products and categories match what shoppers see. Stock is the total available units across variants. Use the full store admin for complex pricing and many variants per product."
      breadcrumbs={
        <AdminBreadcrumbs
          items={[{ label: "Dashboard", href: "/admin" }, { label: "Products" }]}
        />
      }
      bannerSlot={bannerSlot}
      filters={filters}
      actions={actions}
      inspector={
        <AuditTimeline resourcePrefix="product:" title="Recent catalog changes" />
      }
    >
      <div className="mb-6 flex max-w-3xl flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-outline-variant/15 bg-surface-container-low/80 px-4 py-3 text-sm">
        <span className="font-semibold text-on-surface">Connected areas</span>
        <Link className="text-primary hover:underline" href="/admin/inventory">
          Inventory
        </Link>
        <span className="text-on-surface-variant/50" aria-hidden>
          |
        </span>
        <Link className="text-primary hover:underline" href="/admin/orders">
          Orders
        </Link>
        <span className="text-on-surface-variant/50" aria-hidden>
          |
        </span>
        <Link className="text-primary hover:underline" href="/admin/pos">
          POS
        </Link>
        <span className="text-on-surface-variant/50" aria-hidden>
          |
        </span>
        <a
          className="text-primary hover:underline"
          href={`${shopOrigin}/shop`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Storefront shop
        </a>
      </div>

      <AdminTechnicalDetails className="mb-6 max-w-3xl">
        <p>
          The full store admin opens in a new tab for advanced edits. Stock totals need a warehouse
          link for each item. If stock shows a dash, open Inventory or the full store admin to set
          quantities.
        </p>
      </AdminTechnicalDetails>

      <div className="overflow-hidden rounded-lg border border-outline-variant/20 bg-surface-container-lowest shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-outline-variant/20 text-left text-xs uppercase tracking-widest text-on-surface-variant">
              <th className="px-4 py-3">Product</th>
              <th className="hidden px-4 py-3 lg:table-cell">Shop</th>
              <th className="hidden px-4 py-3 md:table-cell">Status</th>
              <th className="hidden px-4 py-3 sm:table-cell">Variants</th>
              <th className="hidden px-4 py-3 text-right xl:table-cell">Stock</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-14 text-center leading-relaxed text-on-surface-variant"
                >
                  {commerceUnavailable
                    ? "No data yet. Try again after the store is online."
                    : query
                      ? "No products match your search."
                      : "No products yet. Use Add product to create one in this admin."}
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-outline-variant/10 last:border-0 hover:bg-surface-container-low/60"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-surface-container-high">
                        {p.thumbnail ? (
                          <Image
                            src={p.thumbnail}
                            alt=""
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] text-on-surface-variant">
                            No image
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-primary">{p.title || "Untitled"}</p>
                        <p className="truncate text-xs text-on-surface-variant">{p.handle}</p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden max-w-[220px] align-top lg:table-cell">
                    <p className="text-xs text-on-surface-variant">
                      <span className="font-semibold text-on-surface">Categories: </span>
                      {p.categorySummary}
                    </p>
                    <p className="mt-1 text-xs text-on-surface-variant">
                      <span className="font-semibold text-on-surface">Size / Color: </span>
                      {p.sizeColorSummary}
                    </p>
                    {p.shopNotes.length > 0 ? (
                      <ul className="mt-2 list-inside list-disc text-[11px] text-amber-900">
                        {p.shopNotes.map((n) => (
                          <li key={n}>{n}</li>
                        ))}
                      </ul>
                    ) : null}
                  </td>
                  <td className="hidden capitalize text-on-surface-variant md:table-cell">
                    {p.status.replace(/_/g, " ")}
                  </td>
                  <td className="hidden text-on-surface-variant sm:table-cell">{p.variantCount}</td>
                  <td
                    className="hidden text-right font-mono text-on-surface-variant xl:table-cell"
                    title="Available units summed across variants (inventory)"
                  >
                    {formatAggregatedStock(p, stockByProduct)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-col items-end gap-1 sm:flex-row sm:justify-end sm:gap-3">
                      <Link
                        href={`/admin/catalog/${p.id}`}
                        className="text-xs font-semibold uppercase tracking-wide text-primary hover:underline"
                      >
                        Edit here
                      </Link>
                      <a
                        href={getMedusaAdminProductEditUrl(p.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant hover:underline"
                      >
                        Store admin
                      </a>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-8 max-w-3xl text-xs leading-relaxed text-on-surface-variant">
        Orders, inventory, and point of sale share the same catalog as checkout. Stock is available
        quantity when each variant is linked to inventory. Rules for collections, discounts, and
        shipping are managed in the full store admin.
      </p>
    </CrudManagerLayout>
  );
}
