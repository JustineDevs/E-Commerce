import type { ReactNode } from "react";

export type AdminEmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

/**
 * Shared empty state for list pages (orders, queue, workflow).
 */
export function AdminEmptyState({ title, description, action }: AdminEmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-outline-variant/30 bg-surface-container-lowest p-10 text-center">
      <p className="text-sm font-semibold text-on-surface">{title}</p>
      {description ? (
        <p className="mt-2 text-sm text-on-surface-variant">{description}</p>
      ) : null}
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}

export type AdminErrorStateProps = {
  title: string;
  detail?: string;
};

export function AdminErrorState({ title, detail }: AdminErrorStateProps) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-outline-variant/30 bg-surface-container-low p-6 text-sm text-on-surface"
    >
      <p className="font-semibold">{title}</p>
      {detail ? <p className="mt-2 text-on-surface-variant">{detail}</p> : null}
    </div>
  );
}

export type AdminLoadingStateProps = {
  label?: string;
};

export function AdminLoadingState({ label = "Loading" }: AdminLoadingStateProps) {
  return (
    <div className="flex min-h-[12rem] flex-col items-center justify-center gap-3 text-sm text-on-surface-variant">
      <span
        className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
        aria-hidden
      />
      <span>{label}</span>
    </div>
  );
}
