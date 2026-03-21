import Link from "next/link";
import {
  FulfillmentPanel,
  type ShipmentRow,
} from "@/components/FulfillmentPanel";
import { fetchMedusaOrderDetailForAdmin } from "@/lib/medusa-order-bridge";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const result = await fetchMedusaOrderDetailForAdmin(orderId);
  const order = result?.order ?? null;
  const shipments: ShipmentRow[] = result?.shipments ?? [];

  if (!order) {
    return (
      <main className="min-h-screen p-8 lg:p-12">
        <p className="text-on-surface-variant">Order not found.</p>
        <Link
          href="/admin/orders"
          className="text-primary mt-4 inline-block underline"
        >
          Back to orders
        </Link>
      </main>
    );
  }

  const items = order.order_items ?? [];

  return (
    <main className="min-h-screen p-8 lg:p-12 max-w-5xl mx-auto">
      <Link
        href="/admin/orders"
        className="text-sm text-on-surface-variant hover:text-primary mb-8 inline-block"
      >
        &larr; Orders
      </Link>
      <header className="mb-10">
        <h1 className="text-4xl font-extrabold tracking-tighter text-primary font-headline">
          {order.order_number}
        </h1>
        <p className="text-on-surface-variant mt-2 text-sm">
          {order.channel} &middot; {order.status.replace(/_/g, " ")} &middot;{" "}
          {order.currency} {Number(order.grand_total).toLocaleString("en-PH")}
        </p>
        <p className="text-xs text-on-surface-variant mt-1">
          {new Date(order.created_at).toLocaleString("en-PH")}
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <section className="rounded-lg border border-outline-variant/20 bg-surface-container-lowest p-6">
          <h2 className="font-headline text-sm font-bold uppercase tracking-widest text-primary mb-4">
            Line items
          </h2>
          {items.length === 0 ? (
            <p className="text-sm text-on-surface-variant">No line items.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {items.map((li) => (
                <li
                  key={li.id}
                  className="border-b border-outline-variant/10 pb-3 last:border-0"
                >
                  <p className="font-medium text-primary">
                    {li.product_name_snapshot}
                  </p>
                  <p className="text-on-surface-variant text-xs">
                    {li.sku_snapshot} &middot; {li.size_snapshot} /{" "}
                    {li.color_snapshot} &times; {li.quantity}
                  </p>
                  <p className="text-on-surface-variant mt-1">
                    {order.currency}{" "}
                    {Number(li.line_total).toLocaleString("en-PH")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <FulfillmentPanel
          orderId={order.id}
          initialStatus={order.status}
          initialShipments={shipments}
        />
      </div>
    </main>
  );
}
