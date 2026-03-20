import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-slate-900">Apparel Commerce</h1>
        <p className="mt-2 text-slate-600">Welcome to our store.</p>
        <Link
          href="/shop"
          className="mt-6 inline-block rounded-md bg-slate-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          Shop now
        </Link>
      </div>
    </main>
  );
}
