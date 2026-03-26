import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-extrabold text-primary font-headline mb-4">
          404
        </h1>
        <p className="text-on-surface-variant text-sm mb-8">
          This page is not available, or the address may have changed.
        </p>
        <Link
          href="/admin"
          className="inline-block bg-primary text-on-primary px-6 py-3 rounded font-medium text-sm hover:opacity-90 transition-opacity"
        >
          Back to Dashboard
        </Link>
      </div>
    </main>
  );
}
