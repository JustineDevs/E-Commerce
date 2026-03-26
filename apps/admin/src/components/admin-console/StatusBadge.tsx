export type WorkflowStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "scheduled"
  | "published"
  | "archived"
  | "failed"
  | "canceled"
  | string;

const STYLES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  pending_review: "bg-amber-50 text-amber-900 border-amber-200",
  approved: "bg-emerald-50 text-emerald-900 border-emerald-200",
  scheduled: "bg-sky-50 text-sky-900 border-sky-200",
  published: "bg-primary/10 text-primary border-primary/30",
  archived: "bg-slate-100 text-slate-500 border-slate-200",
  failed: "bg-red-50 text-red-900 border-red-200",
  canceled: "bg-slate-100 text-slate-500 border-slate-200",
};

export function StatusBadge({
  status,
  label,
}: {
  status: WorkflowStatus;
  label?: string;
}) {
  const key = (status || "").toLowerCase().replace(/\s+/g, "_");
  const cls =
    STYLES[key] ?? "bg-surface-container-high text-on-surface border-outline-variant/30";
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${cls}`}
    >
      {label ?? status.replace(/_/g, " ")}
    </span>
  );
}
