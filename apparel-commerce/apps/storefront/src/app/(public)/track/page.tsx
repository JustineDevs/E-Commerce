import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ orderId?: string }>;
};

export default async function TrackRedirectPage({ searchParams }: Props) {
  const { orderId } = await searchParams;
  if (orderId?.trim()) {
    redirect(`/track/${encodeURIComponent(orderId.trim())}`);
  }

  return (
    <main className="pt-32 pb-24 px-8 max-w-2xl mx-auto">
      <h1 className="font-headline text-4xl font-extrabold tracking-tighter text-primary mb-2">
        Track Order
      </h1>
      <p className="font-body text-on-surface-variant mb-12">
        Enter your order number to view shipment status.
      </p>
      <form action="/track" method="GET" className="space-y-4">
        <input
          type="text"
          name="orderId"
          placeholder="Order number"
          required
          className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded px-4 py-3 font-body text-sm outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          type="submit"
          className="bg-primary text-on-primary px-6 py-3 rounded font-medium hover:opacity-90"
        >
          Track
        </button>
      </form>
    </main>
  );
}
