import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { isStaffRole, staffHasPermission, staffPermissionListForSession } from "@apparel-commerce/database";
import { AdminPageShell, AuditTimeline } from "@/components/admin-console";
import { AdminTechnicalDetails } from "@/components/AdminTechnicalDetails";
import { fetchMedusaOrdersForAdmin } from "@/lib/medusa-order-bridge";
import { fetchAllMedusaInventoryRows } from "@/lib/medusa-inventory-bridge";
import { authOptions } from "@/lib/auth";
import { getStorefrontPublicOrigin } from "@/lib/storefront-public-url";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const { denied } = await searchParams;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/api/auth/signin");
  }
  const role = session.user.role ?? "";
  if (!isStaffRole(role)) {
    redirect("/api/auth/signin");
  }

  const perms = staffPermissionListForSession(session);
  const canDashboard = staffHasPermission(perms, "dashboard:read");

  if (!canDashboard) {
    const bannerSlot = (
      <>
        {denied ? (
          <div className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <p className="font-medium">That screen is not available for your role.</p>
            <p className="mt-1 text-xs text-amber-900/80">
              Ask an administrator if you need access. Reference:{" "}
              <span className="font-mono">{denied}</span>
            </p>
          </div>
        ) : null}
        <div className="rounded border border-outline-variant/30 bg-surface-container-high px-4 py-3 text-sm text-on-surface">
          <p className="font-medium text-primary">Overview is not enabled for your account</p>
          <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
            Your account may need to be on the administrator allow list, or an administrator must
            grant dashboard access for staff. Sign out and sign in again after your access is updated.
          </p>
        </div>
      </>
    );
    return (
      <AdminPageShell
        title="Overview"
        subtitle="Recent sales and stock summary."
        bannerSlot={bannerSlot}
      >
        <p className="text-sm text-on-surface-variant">
          When access is granted, order totals and inventory will load here.
        </p>
      </AdminPageShell>
    );
  }

  const [ordersResult, inventory] = await Promise.all([
    fetchMedusaOrdersForAdmin(10),
    fetchAllMedusaInventoryRows({ batchSize: 100 }),
  ]);

  const { orders, total: totalOrders, commerceUnavailable } = ordersResult;

  const activeOrders = orders.filter(
    (o) => o.status !== "delivered" && o.status !== "cancelled",
  );
  const lowStockCount = inventory.filter((i) => i.available > 0 && i.available <= 5).length;
  const outOfStockCount = inventory.filter((i) => i.available <= 0).length;

  const shopOrigin = getStorefrontPublicOrigin();

  const bannerSlot = (
    <>
      {denied && (
        <div className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-medium">That screen is not available for your role.</p>
          <p className="mt-1 text-xs text-amber-900/80">
            Ask an administrator if you need access. Reference:{" "}
            <span className="font-mono">{denied}</span>
          </p>
        </div>
      )}
      {commerceUnavailable && (
        <div className="rounded border border-outline-variant/30 bg-surface-container-high px-4 py-3 text-sm text-on-surface">
          <p className="font-medium text-primary">Store connection unavailable</p>
          <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
            This often happens in the first minute after the system starts. Wait a moment, then use
            refresh in your browser. If the problem continues, ask whoever runs your servers to check
            that the online store service is running.
          </p>
          <AdminTechnicalDetails className="mt-3">
            <p>
              This screen loads orders and stock from your store service. During local development it
              often listens on <code>port 9000</code>. Start order: run <code>pnpm run dev</code>,
              wait until the terminal shows the store service is ready (for example{" "}
              <code>Server is ready on port: 9000</code>), then reload this page.
            </p>
          </AdminTechnicalDetails>
        </div>
      )}
    </>
  );

  return (
    <AdminPageShell
      title="Overview"
      subtitle="Recent sales and stock summary. One commerce system powers the storefront catalog, inventory, orders, and POS."
      bannerSlot={bannerSlot}
      inspector={<AuditTimeline title="Recent activity" />}
    >
      <section className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/admin/orders"
          className="bg-surface-container-lowest p-6 rounded shadow-[0px_20px_40px_rgba(0,0,0,0.02)] border-l-4 border-primary hover:shadow-md transition-shadow"
        >
          <span className="text-[10px] font-bold tracking-widest text-secondary uppercase">
            Total Orders
          </span>
          <h3 className="text-2xl font-bold tracking-tight text-primary mt-2">
            {totalOrders}
          </h3>
          <p className="text-[10px] text-on-surface-variant mt-1 font-medium">
            All time
          </p>
        </Link>
        <Link
          href="/admin/orders"
          className="bg-surface-container-lowest p-6 rounded shadow-[0px_20px_40px_rgba(0,0,0,0.02)] hover:shadow-md transition-shadow"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold tracking-widest text-secondary uppercase">
              Active Orders
            </span>
            {activeOrders.length > 0 && (
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                <span className="text-[10px] font-bold text-emerald-600">
                  Live
                </span>
              </div>
            )}
          </div>
          <h3 className="text-2xl font-bold tracking-tight text-primary mt-2">
            {activeOrders.length}
          </h3>
          <p className="text-[10px] text-on-surface-variant mt-1 font-medium">
            Awaiting fulfillment
          </p>
        </Link>
        <Link
          href="/admin/inventory"
          className="bg-surface-container-lowest p-6 rounded shadow-[0px_20px_40px_rgba(0,0,0,0.02)] hover:shadow-md transition-shadow"
        >
          <span className="text-[10px] font-bold tracking-widest text-secondary uppercase">
            Stock lines
          </span>
          <h3 className="text-2xl font-bold tracking-tight text-primary mt-2">
            {inventory.length}
          </h3>
          <p className="text-[10px] text-on-surface-variant mt-1 font-medium">
            Tracked in inventory
          </p>
        </Link>
        <div className="bg-surface-container-lowest p-6 rounded shadow-[0px_20px_40px_rgba(0,0,0,0.02)]">
          <span className="text-[10px] font-bold tracking-widest text-secondary uppercase">
            Stock Alerts
          </span>
          <h3 className="text-2xl font-bold tracking-tight text-primary mt-2">
            {lowStockCount + outOfStockCount}
          </h3>
          <p className="text-[10px] text-on-surface-variant mt-1 font-medium">
            {lowStockCount} low stock, {outOfStockCount} out of stock
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2 space-y-6">
          <div className="bg-surface-container-lowest p-8 rounded shadow-[0px_20px_40px_rgba(0,0,0,0.02)]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg tracking-tight">
                Recent Orders
              </h3>
              <Link
                href="/admin/orders"
                className="text-xs font-bold text-primary uppercase tracking-widest hover:underline"
              >
                View all
              </Link>
            </div>
            {orders.length === 0 && !commerceUnavailable ? (
              <p className="text-sm text-on-surface-variant py-8 text-center">
                No orders yet. They will appear here once customers check out.
              </p>
            ) : orders.length === 0 ? (
              <p className="text-sm text-on-surface-variant py-8 text-center">
                Order list is not available until the store connection is restored. Try refreshing in a
                moment.
              </p>
            ) : (
              <div className="space-y-4">
                {orders.slice(0, 5).map((o) => (
                  <Link
                    key={o.id}
                    href={`/admin/orders/${o.id}`}
                    className="flex items-center gap-4 group"
                  >
                    <div className="w-10 h-10 rounded bg-surface-container-low flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-secondary text-lg">
                        receipt_long
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-primary group-hover:underline truncate">
                        Order #{o.order_number}
                      </p>
                      <p className="text-xs text-on-surface-variant">
                        {o.email ?? "Guest"} &middot;{" "}
                        {o.status.replace(/_/g, " ")}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-primary shrink-0">
                      {o.currency}{" "}
                      {Number(o.grand_total).toLocaleString("en-PH")}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-8">
          {(lowStockCount > 0 || outOfStockCount > 0) && (
            <div className="bg-primary text-on-primary p-8 rounded shadow-xl shadow-primary/20">
              <div className="flex items-center gap-3 mb-6">
                <span
                  className="material-symbols-outlined text-error"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  warning
                </span>
                <h3 className="font-bold text-sm tracking-widest uppercase">
                  Stock Alerts
                </h3>
              </div>
              <div className="space-y-3">
                {inventory
                  .filter((i) => i.available <= 5)
                  .slice(0, 5)
                  .map((i) => (
                    <div
                      key={i.variantId}
                      className="pb-3 border-b border-white/10 last:border-0"
                    >
                      <p className="text-xs font-bold">{i.productName}</p>
                      <p className="text-[10px] text-on-primary-fixed-variant">
                        {i.sku} &middot; {i.size} {i.color} &middot;{" "}
                        {i.available <= 0 ? "Out of stock" : `${i.available} left`}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          )}
          <div className="bg-surface-container-lowest p-8 rounded shadow-[0px_20px_40px_rgba(0,0,0,0.02)]">
            <h3 className="font-bold text-lg tracking-tight mb-4">
              Quick Actions
            </h3>
            <div className="space-y-3">
              <Link
                href="/admin/catalog"
                className="block rounded border border-outline-variant/20 p-3 text-sm font-medium text-primary hover:bg-surface-container-low transition-colors"
              >
                Products catalog
              </Link>
              <Link
                href="/admin/orders"
                className="block rounded border border-outline-variant/20 p-3 text-sm font-medium text-primary hover:bg-surface-container-low transition-colors"
              >
                View orders
              </Link>
              <Link
                href="/admin/inventory"
                className="block rounded border border-outline-variant/20 p-3 text-sm font-medium text-primary hover:bg-surface-container-low transition-colors"
              >
                Check inventory
              </Link>
              <Link
                href="/admin/pos"
                className="block rounded border border-outline-variant/20 p-3 text-sm font-medium text-primary hover:bg-surface-container-low transition-colors"
              >
                Open POS terminal
              </Link>
              <a
                href={`${shopOrigin}/shop`}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded border border-outline-variant/20 p-3 text-sm font-medium text-primary hover:bg-surface-container-low transition-colors"
              >
                Open storefront shop
              </a>
            </div>
          </div>
        </aside>
      </div>
    </AdminPageShell>
  );
}
