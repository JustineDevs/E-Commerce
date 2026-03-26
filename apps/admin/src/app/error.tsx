"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-extrabold text-primary font-headline mb-4">
          Something went wrong
        </h1>
        <p className="text-on-surface-variant text-sm mb-2">
          {error.message || "An unexpected error occurred."}
        </p>
        {error.digest && (
          <p className="text-xs text-on-surface-variant mb-6 font-mono">
            Ref: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          className="inline-block bg-primary text-on-primary px-6 py-3 rounded font-medium text-sm hover:opacity-90 transition-opacity"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
