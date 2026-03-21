import type { CommerceFetchFailure } from "@/lib/catalog-fetch";

type Props = { failure: CommerceFetchFailure };

export function StorefrontCommerceAlert({ failure }: Props) {
  if (failure.kind === "misconfigured") {
    return (
      <div
        role="alert"
        className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100"
      >
        <p className="font-semibold">Store configuration required</p>
        <p className="mt-1 opacity-90">{failure.detail}</p>
      </div>
    );
  }
  return (
    <div
      role="alert"
      className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-950 dark:text-red-100"
    >
      <p className="font-semibold">Catalog service unavailable</p>
      <p className="mt-1 font-mono text-xs opacity-90">{failure.message}</p>
    </div>
  );
}
