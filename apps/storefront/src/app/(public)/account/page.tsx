import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  return (
    <main className="storefront-page-shell max-w-4xl">
      <h1 className="font-headline text-4xl font-extrabold tracking-tighter text-primary mb-2">
        Account
      </h1>
      <p className="font-body text-on-surface-variant mb-12">
        Manage your profile and orders.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section className="bg-surface-container-lowest rounded shadow-[0px_20px_40px_rgba(0,0,0,0.02)] p-8">
          <h2 className="font-headline text-sm font-bold uppercase tracking-widest text-primary mb-6">
            Profile
          </h2>
          {user ? (
            <div className="space-y-3">
              {user.image && (
                <img
                  src={user.image}
                  alt=""
                  className="w-14 h-14 rounded-full"
                  referrerPolicy="no-referrer"
                />
              )}
              <p className="text-sm font-medium text-on-surface">{user.name}</p>
              <p className="text-sm text-on-surface-variant">{user.email}</p>
              <form action="/api/auth/signout" method="POST">
                <button
                  type="submit"
                  className="mt-4 inline-block border border-outline-variant/40 text-on-surface-variant px-6 py-2.5 rounded font-medium hover:bg-surface-container-low text-sm"
                >
                  Sign out
                </button>
              </form>
            </div>
          ) : (
            <>
              <p className="text-on-surface-variant text-sm mb-6">
                Sign in with Google to view and update your profile.
              </p>
              <Link
                href="/sign-in?callbackUrl=/account"
                className="inline-block bg-primary text-on-primary px-6 py-2.5 rounded font-medium hover:opacity-90"
              >
                Sign in
              </Link>
            </>
          )}
        </section>

        <section className="bg-surface-container-lowest rounded shadow-[0px_20px_40px_rgba(0,0,0,0.02)] p-8">
          <h2 className="font-headline text-sm font-bold uppercase tracking-widest text-primary mb-6">
            Order History
          </h2>
          <p className="text-on-surface-variant text-sm mb-6">
            View and track your orders.
          </p>
          <p className="text-on-surface-variant text-sm">
            No orders yet.{" "}
            <Link href="/shop" className="text-primary hover:underline">
              Start shopping
            </Link>
            .
          </p>
        </section>
      </div>

      <section className="mt-12 bg-surface-container-lowest rounded shadow-[0px_20px_40px_rgba(0,0,0,0.02)] p-8">
        <h2 className="font-headline text-sm font-bold uppercase tracking-widest text-primary mb-6">
          Track an Order
        </h2>
        <p className="text-on-surface-variant text-sm mb-4">
          Enter your order number to track shipment status.
        </p>
        <form action="/track" method="GET" className="flex flex-col gap-4">
          <input
            type="text"
            name="orderId"
            placeholder="Order number or full tracking link from email"
            className="w-full bg-surface-container-low border border-outline-variant/30 rounded px-4 py-3 font-body text-sm outline-none focus:ring-1 focus:ring-primary"
          />
          <input
            type="text"
            name="t"
            placeholder="Tracking code (if not pasting full link)"
            className="w-full bg-surface-container-low border border-outline-variant/30 rounded px-4 py-3 font-body text-sm outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            type="submit"
            className="bg-primary text-on-primary px-6 py-3 rounded font-medium hover:opacity-90 w-fit"
          >
            Track
          </button>
        </form>
        <p className="text-xs text-on-surface-variant mt-2">
          Your confirmation email includes a secure tracking link. You need that
          link or both the order reference and tracking code together.
        </p>
      </section>
    </main>
  );
}
