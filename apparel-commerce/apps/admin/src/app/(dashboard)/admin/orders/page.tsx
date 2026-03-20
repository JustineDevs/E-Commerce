import Link from "next/link";
import { getApiUrl, getInternalApiHeaders } from "@apparel-commerce/sdk";

export const dynamic = "force-dynamic";

type OrderRow = {
  id: string;
  order_number: string;
  customer_id: string | null;
  status: string;
  channel: string;
  currency: string;
  grand_total: number;
  created_at: string;
};

async function fetchOrders(): Promise<{ orders: OrderRow[]; total: number }> {
  const base = process.env.API_URL ?? getApiUrl();
  const res = await fetch(`${base}/orders?limit=50`, {
    cache: "no-store",
    headers: { ...getInternalApiHeaders() },
  });
  if (!res.ok) return { orders: [], total: 0 };
  return res.json();
}

export default async function OrdersPage() {
  const { orders, total } = await fetchOrders();

  return (
    <main className="min-h-screen p-8 lg:p-12">
      <header className="flex justify-between items-end mb-12">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tighter text-primary font-headline">
            Orders
          </h2>
          <p className="text-on-surface-variant mt-2 font-body text-sm">
            Order fulfillment hub.
          </p>
        </div>
      </header>
      <div className="bg-surface-container-lowest rounded shadow-[0px_20px_40px_rgba(0,0,0,0.02)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-container-high">
              <th className="text-left py-4 px-6 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                Order
              </th>
              <th className="text-left py-4 px-6 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                Customer
              </th>
              <th className="text-left py-4 px-6 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                Status
              </th>
              <th className="text-right py-4 px-6 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-16 text-center text-on-surface-variant">
                  No orders yet.
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id} className="border-b border-surface-container-high/50">
                  <td className="py-4 px-6 font-medium text-primary">
                    <Link href={`/admin/orders/${o.id}`} className="hover:underline">
                      {o.order_number}
                    </Link>
                  </td>
                  <td className="py-4 px-6 text-on-surface-variant text-sm">
                    {o.customer_id ? "Customer" : "Guest"}
                  </td>
                  <td className="py-4 px-6 text-on-surface-variant text-sm">{o.status}</td>
                  <td className="py-4 px-6 text-right font-medium">
                    {o.currency} {Number(o.grand_total).toLocaleString("en-PH")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
