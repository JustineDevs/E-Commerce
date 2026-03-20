import Link from "next/link";
import { getCommerceSource } from "@/lib/commerce-source";
import { fetchMedusaTrackByCartId, fetchMedusaTrackByOrderId } from "@/lib/medusa-track-fetch";

export const dynamic = "force-dynamic";

type TrackPayload = {
  order: Record<string, unknown> & {
    id?: string;
    order_number?: string;
    status?: string;
  };
  shipments: Array<{
    id: string;
    tracking_number?: string;
    status?: string;
    carrier_slug?: string;
  }>;
};

async function fetchPublicTrack(orderId: string, token: string | undefined): Promise<{
  ok: boolean;
  data: TrackPayload | null;
  status: number;
}> {
  const base = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  if (getCommerceSource() === "medusa") {
    if (orderId.startsWith("order_")) {
      return fetchMedusaTrackByOrderId(orderId);
    }
    if (orderId.startsWith("cart_")) {
      return fetchMedusaTrackByCartId(orderId);
    }
  }
  if (!token?.trim()) {
    return { ok: false, data: null, status: 400 };
  }
  const url = new URL(`${base.replace(/\/$/, "")}/public/orders/${encodeURIComponent(orderId)}`);
  url.searchParams.set("t", token.trim());
  try {
    const res = await fetch(url.toString(), {
      next: { revalidate: 30 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      return { ok: false, data: null, status: res.status };
    }
    const data = (await res.json()) as TrackPayload;
    return { ok: true, data, status: res.status };
  } catch {
    return { ok: false, data: null, status: 500 };
  }
}

export default async function TrackPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { orderId: rawOrderId } = await params;
  const { t } = await searchParams;
  const orderId = decodeURIComponent(rawOrderId.trim());

  const medusaNoTokenOk =
    getCommerceSource() === "medusa" &&
    (orderId.startsWith("order_") || orderId.startsWith("cart_")) &&
    !t?.trim();

  if (!t?.trim() && !medusaNoTokenOk) {
    return (
      <main className="pt-32 pb-24 px-8 max-w-2xl mx-auto text-center">
        <h1 className="font-headline text-2xl font-bold text-primary mb-4">Tracking link incomplete</h1>
        <p className="font-body text-on-surface-variant mb-6">
          Open the full link from your order confirmation email, or enter your order number and tracking code on the{" "}
          <Link href="/track" className="text-primary underline">
            track order
          </Link>{" "}
          page.
        </p>
        <Link
          href="/shop"
          className="inline-block bg-primary text-on-primary px-6 py-2.5 rounded font-medium hover:opacity-90"
        >
          Continue shopping
        </Link>
      </main>
    );
  }

  const { ok, data, status } = await fetchPublicTrack(orderId, t);

  if (status === 503) {
    return (
      <main className="pt-32 pb-24 px-8 max-w-2xl mx-auto text-center">
        <h1 className="font-headline text-2xl font-bold text-primary mb-4">Tracking unavailable</h1>
        <p className="font-body text-on-surface-variant mb-6">
          Order tracking is not configured on this environment. Please contact support.
        </p>
        <Link href="/track" className="text-primary underline">
          Back to track order
        </Link>
      </main>
    );
  }

  if (!ok || !data?.order) {
    return (
      <main className="pt-32 pb-24 px-8 max-w-2xl mx-auto text-center">
        <h1 className="font-headline text-2xl font-bold text-primary mb-4">Order not found</h1>
        <p className="font-body text-on-surface-variant mb-6">
          We could not find a matching order. Check your order number, tracking code, and link from your confirmation
          email.
        </p>
        <Link
          href="/shop"
          className="inline-block bg-primary text-on-primary px-6 py-2.5 rounded font-medium hover:opacity-90"
        >
          Continue shopping
        </Link>
      </main>
    );
  }

  const { order, shipments } = data;
  const displayRef = order.order_number ?? orderId;

  const statusSteps = ["pending_payment", "paid", "ready_to_ship", "shipped", "delivered"];
  const currentIndex = statusSteps.indexOf(String(order.status ?? "")) >= 0
    ? statusSteps.indexOf(String(order.status))
    : 0;

  return (
    <main className="pt-32 pb-24 px-8 max-w-2xl mx-auto">
      <Link href="/account" className="text-sm text-on-surface-variant hover:text-primary mb-8 inline-block">
        Back to account
      </Link>

      <h1 className="font-headline text-4xl font-extrabold tracking-tighter text-primary mb-2">Order {displayRef}</h1>
      <p className="font-body text-on-surface-variant mb-12">
        Status: {(order.status as string)?.replace(/_/g, " ") ?? "Unknown"}
      </p>

      <div className="bg-surface-container-lowest rounded shadow-[0px_20px_40px_rgba(0,0,0,0.02)] p-8 mb-8">
        <h2 className="font-headline text-sm font-bold uppercase tracking-widest text-primary mb-6">Progress</h2>
        <div className="space-y-6">
          {statusSteps.map((step, i) => {
            const isComplete = i <= currentIndex;
            const isCurrent = i === currentIndex;
            return (
              <div key={step} className="flex items-center gap-4">
                <div
                  className={`w-4 h-4 rounded-full flex-shrink-0 ${isComplete ? "bg-primary" : "bg-surface-container-high"}`}
                />
                <div>
                  <p className={`font-medium ${isComplete ? "text-primary" : "text-on-surface-variant"}`}>
                    {step.replace(/_/g, " ")}
                  </p>
                  {isCurrent && <p className="text-xs text-on-surface-variant mt-0.5">Current step</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {shipments.length > 0 && (
        <div className="bg-surface-container-lowest rounded shadow-[0px_20px_40px_rgba(0,0,0,0.02)] p-8">
          <h2 className="font-headline text-sm font-bold uppercase tracking-widest text-primary mb-6">Shipments</h2>
          <div className="space-y-6">
            {shipments.map((s) => (
              <div
                key={s.id}
                className="border-b border-surface-container-high pb-6 last:border-0 last:pb-0"
              >
                <p className="font-medium text-primary">{s.tracking_number ?? "Awaiting tracking"}</p>
                <p className="text-sm text-on-surface-variant mt-1">
                  {s.carrier_slug ?? "Carrier"} · {s.status?.replace(/_/g, " ") ?? "Pending"}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {shipments.length === 0 && order.status !== "pending_payment" && (
        <p className="text-on-surface-variant text-sm">
          No shipment records yet. Tracking will appear when your order ships.
        </p>
      )}
    </main>
  );
}
